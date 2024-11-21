import path from "path";
import fs, {constants as fsConstants, promises as fsPromises} from "fs";

import lodash from "lodash";
import {Downloader} from "kodo-s3-adapter-sdk";
import {Adapter, Domain, ObjectHeader, StorageClass, UrlStyle} from "kodo-s3-adapter-sdk/dist/adapter";
import {NatureLanguage} from "kodo-s3-adapter-sdk/dist/uplog";

import {ClientOptions, createQiniuClient} from "@common/qiniu";
import Duration from "@common/const/duration";

import {LocalPath, ProgressCallbackParams, RemotePath, Status} from "./types";
import TransferJob from "./transfer-job";

interface RequiredOptions {
    clientOptions: ClientOptions,

    from: Required<RemotePath>,
    to: LocalPath
    region: string,

    overwrite: boolean,
    storageClasses: StorageClass[],
}

interface DownloadOptions {
    multipartDownloadThreshold: number, // Bytes
    multipartDownloadSize: number, // Bytes
    downloadSpeedLimit: number, // Bytes/s

    isDebug: boolean,

    // could be removed if there is a better uplog
    userNatureLanguage: NatureLanguage,
}

interface OptionalOptions extends DownloadOptions {
    id: string,
    domain: Domain | undefined,
    urlStyle: UrlStyle | undefined,

    status: Status,
    message: string,

    prog: {
        total: number,
        loaded: number,
        resumable?: boolean, // what's difference from resumeDownload?
    },
    timeoutBaseDuration: number, // ms
    retry: number,

    onStatusChange?: (status: Status, prev: Status) => void,
    onProgress?: (prog: DownloadJob["prog"]) => void,
    onPartCompleted?: (partSize: number) => void,
}

type Options = RequiredOptions & Partial<OptionalOptions>

const DEFAULT_OPTIONS: OptionalOptions = {
    id: "",
    domain: undefined,
    urlStyle: undefined,

    multipartDownloadThreshold: 100,
    multipartDownloadSize: 8,
    downloadSpeedLimit: 0, // 0 means no limit

    status: Status.Waiting,

    prog: {
        total: 0,
        loaded: 0,
        resumable: false,
    },
    timeoutBaseDuration: Duration.Second,
    retry: 3,

    message: "",
    isDebug: false,

    userNatureLanguage: "zh-CN",
};

type PersistInfo = {
    storageClasses:  RequiredOptions["storageClasses"],
    region: RequiredOptions["region"],
    to: RequiredOptions["to"],
    from: RequiredOptions["from"],
    backendMode: RequiredOptions["clientOptions"]["backendMode"],
    domain: OptionalOptions["domain"],
    urlStyle: OptionalOptions["urlStyle"],
    prog: OptionalOptions["prog"],
    status: Exclude<OptionalOptions["status"], Status.Waiting | Status.Running>,
    message: OptionalOptions["message"],
    multipartDownloadThreshold: OptionalOptions["multipartDownloadThreshold"],
    multipartDownloadSize: OptionalOptions["multipartDownloadSize"],
};

export default class DownloadJob extends TransferJob {
    static TempFileExt = ".download"
    static fromPersistInfo(
        id: string,
        persistInfo: PersistInfo,
        clientOptions: RequiredOptions["clientOptions"],
        downloadOptions: {
            downloadSpeedLimit: number,
            overwrite: boolean,
            isDebug: boolean,
            userNatureLanguage: NatureLanguage,
        },
        callbacks: {
            onStatusChange?: OptionalOptions["onStatusChange"],
            onProgress?: OptionalOptions["onProgress"],
        } = {},
    ): DownloadJob {
        return new DownloadJob({
            id,
            domain: persistInfo.domain,
            urlStyle: persistInfo.urlStyle,
            status: persistInfo.status,
            message: persistInfo.message,

            from: persistInfo.from,
            to: persistInfo.to,
            prog: persistInfo.prog,

            clientOptions,
            storageClasses: persistInfo.storageClasses,

            overwrite: downloadOptions.overwrite,
            region: persistInfo.region,

            multipartDownloadThreshold: persistInfo.multipartDownloadThreshold,
            multipartDownloadSize: persistInfo.multipartDownloadSize,
            downloadSpeedLimit: downloadOptions.downloadSpeedLimit,
            isDebug: downloadOptions.isDebug,

            userNatureLanguage: downloadOptions.userNatureLanguage,

            ...callbacks,
        });
    }

    // check duplicate and sanitize filename
    static async getTempFilePath(filePath: string, isOverwrite = false) {
        let result = `${filePath}${DownloadJob.TempFileExt}`;

        if (isOverwrite) {
            return result;
        }

        const fileExt = path.extname(filePath);
        const filePathWithoutExt = fileExt.length > 0 ? filePath.slice(0, -fileExt.length) : filePath;
        let duplicateSuffixNum = 0;
        while (true) {
            const isFileExists: boolean = await fsPromises.access(
                result.slice(0, -DownloadJob.TempFileExt.length),
                fsConstants.F_OK,
            )
                .then(() => { return true })
                .catch(() => { return false });
            const isTempFileExists: boolean = await fsPromises.access(result, fsConstants.F_OK)
                .then(() => { return true })
                .catch(() => { return false });
            if (!isFileExists && ! isTempFileExists) {
                break;
            }
            duplicateSuffixNum += 1;
            result = `${filePathWithoutExt}.${duplicateSuffixNum}${fileExt}${DownloadJob.TempFileExt}`;
        }
        return result;
    }

    // - create options -
    protected readonly options: Readonly<RequiredOptions & OptionalOptions>

    // - for process control -
    tempFilePath: string
    downloader?: Downloader

    constructor(config: Options) {
        super(config);

        this.options = lodash.merge({}, DEFAULT_OPTIONS, config);

        this.prog = {
            ...this.options.prog,
            loaded: this.options.prog.loaded,
        };

        this.tempFilePath = `${this.options.to.path}${DownloadJob.TempFileExt}`;
        this.message = this.options.message;

        // hook functions
        this.startDownload = this.startDownload.bind(this);
        this.handleProgress = this.handleProgress.bind(this);
        this.handleHeader = this.handleHeader.bind(this);
        this.handlePartGot = this.handlePartGot.bind(this);
        this.handleDownloadError = this.handleDownloadError.bind(this);
    }

    get uiData() {
        return {
            ...super.uiData,
            from: this.options.from,
            to: this.options.to,
        }
    }

    get persistInfo(): PersistInfo {
        let persistStatus = this.status;
        if (persistStatus === Status.Waiting || persistStatus === Status.Running) {
          persistStatus = Status.Stopped;
        }
        return {
            // read-only info
            region: this.options.region,
            to: this.options.to,
            from: this.options.from,
            domain: this.options.domain,
            urlStyle: this.options.urlStyle,
            storageClasses: this.options.storageClasses,
            backendMode: this.options.clientOptions.backendMode,

            // real-time info
            prog: {
                loaded: this.prog.loaded,
                total: this.prog.total,
                resumable: this.prog.resumable
            },
            status: persistStatus,
            message: this.message,
            multipartDownloadThreshold: this.options.multipartDownloadThreshold,
            multipartDownloadSize: this.options.multipartDownloadSize,
        };
    }

    async start(): Promise<void> {
        if (this.status === Status.Running || this.status === Status.Finished) {
            return;
        }

        if (!this.options.to.name) {
          this.message = "Can't download a file with an empty name!";
          this._status = Status.Failed;
          return;
        }

        this.message = "";
        this._status = Status.Running;

        if (this.options.isDebug) {
            console.log(`Try downloading kodo://${this.options.from.bucket}/${this.options.from.key} to ${this.options.to.path}`);
        }

        // create client
        const qiniuClient = createQiniuClient(this.options.clientOptions, {
            userNatureLanguage: this.options.userNatureLanguage,
            isDebug: this.options.isDebug,
        });

        await qiniuClient.enter(
            "downloadFile",
            this.startDownload,
            {
                targetBucket: this.options.from.bucket,
                targetKey: this.options.from.key,
            },
        ).catch(err => {
            return this.handleDownloadError(err);
        });
    }

    private async startDownload(client: Adapter) {
        client.storageClasses = this.options.storageClasses;

        // prevent the base directory has gone by unexpected reason.
        await this.checkAndCreateBaseDir(this.options.to.path);

        // check overwrite
        // the reason for overwrite when `this.prog.loaded > 0` is to allow
        // download from breakpoint to work properly.
        const isOverwrite = this.options.overwrite || this.prog.loaded > 0;
        this.tempFilePath = await DownloadJob.getTempFilePath(
            this.options.to.path,
            isOverwrite,
        );
        this.options.to.path = this.tempFilePath.slice(0, -DownloadJob.TempFileExt.length);

        // check stopped
        if (this.status === Status.Stopped) {
            return;
        }

        // download
        this.downloader = new Downloader(client);
        await this.downloader.getObjectToFile(
            this.options.region,
            {
                bucket: this.options.from.bucket,
                key: this.options.from.key,
            },
            this.tempFilePath,
            this.options.domain,
            {
                urlStyle: this.options.urlStyle,
                recoveredFrom: this.prog.resumable
                    ? this.prog.loaded
                    : 0,
                partSize: this.options.multipartDownloadSize,
                downloadThrottleOption: this.options.downloadSpeedLimit
                    ? {
                        rate: this.options.downloadSpeedLimit,
                    }
                    : undefined,
                getCallback: {
                    headerCallback: this.handleHeader,
                    partGetCallback: this.handlePartGot,
                    progressCallback: this.handleProgress,
                },
            },
        );

        this._status = Status.Verifying;

        // complete download
        await fsPromises.rename(
            this.tempFilePath,
            this.options.to.path,
        );
        this._status = Status.Finished;
    }

    stop(): this {
        // only `Waiting`, `Running` job could be stopped.
        if (
            ![
              Status.Waiting,
              Status.Running,
            ].includes(this.status)
        ) {
            return this;
        }

        if (this.options.isDebug) {
            console.log(`Pausing ${this.options.from.key}`);
        }

        if (!this.downloader) {
            this._status = Status.Stopped;
            return this;
        }
        this.downloader.abort();
        this.downloader = undefined;

        return this;
    }

    wait(): this {
        if (this.status === Status.Waiting) {
            return this;
        }
        this._status = Status.Waiting;

        if (this.options.isDebug) {
            console.log(`Pending ${this.options.from.key}`);
        }

        if (!this.downloader) {
            return this;
        }
        this.downloader.abort();
        this.downloader = undefined;

        return this;
    }

    tryCleanupDownloadFile(): this {
        if ([Status.Finished, Status.Waiting].includes(this.status)) {
            return this;
        }
        try {
            fs.unlinkSync(this.tempFilePath);
        } catch (_err) {
            // ignore error
        }
        return this;
    }

    protected async retry() {
        if (!this.shouldRetry) {
            return;
        }

        this.retriedTimes += 1;
        // maybe not reconnected, so backoff.
        await this.backoff();
        if (this.status !== Status.Running) {
            // handle user may cancel job while backoff
            return;
        }

        // stop no progress downloader
        this.downloader?.abort();
        this.downloader = undefined;

        // create client
        const qiniuClient = createQiniuClient(this.options.clientOptions, {
            userNatureLanguage: this.options.userNatureLanguage,
            isDebug: this.options.isDebug,
        });

        // retry upload
        await qiniuClient.enter(
            "downloadFile",
            this.startDownload,
            {
                targetBucket: this.options.from.bucket,
                targetKey: this.options.from.key,
            },
        ).catch(err => {
            return this.handleDownloadError(err);
        });
    }

    protected handleStatusChange(status:Status, prev:Status) {
        this.options.onStatusChange?.(status, prev);
    }

    protected handleProgress(p: ProgressCallbackParams): void {
        if (!this.downloader) {
            return;
        }

        super.handleProgress(p);

        this.options.onProgress?.(lodash.merge({}, this.prog));
    }

    private handleHeader(_objectHeader: ObjectHeader): void {
        if (!this.downloader) {
            return;
        }
        // useless?
    }

    private handlePartGot(partSize: number): void {
        if (!this.downloader) {
            return;
        }
        this.options.onPartCompleted?.(partSize)
    }

    private async checkAndCreateBaseDir(filePath: string) {
        const baseDirPath = path.dirname(filePath);
        const isBaseDirValid: boolean = await fsPromises.access(
            baseDirPath,
            fsConstants.R_OK | fsConstants.W_OK | fsConstants.X_OK,
        )
            .then(() => true)
            .catch(() => false);
        if (isBaseDirValid) {
            return;
        }
        try {
          await fsPromises.mkdir(baseDirPath, {recursive: true});
        } catch (err: any) {
          if (err.code === "EEXIST") {
            return;
          }
          throw new Error(`Can't download to ${baseDirPath}`, {cause: err});
        }
    }

    private async handleDownloadError(err: Error) {
        if (err === Downloader.userCanceledError) {
            this._status = Status.Stopped;
            return;
        }

        if (err === Downloader.chunkTimeoutError && this.shouldRetry) {
            await this.retry();
            return;
        }

        this._status = Status.Failed;
        this.message = err.toString();
    }
}
