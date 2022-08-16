import path from "path";
import fs, {promises as fsPromises, constants as fsConstants} from "fs";

import lodash from "lodash";
import {Downloader} from "kodo-s3-adapter-sdk";
import {Adapter, Domain, ObjectHeader, StorageClass} from "kodo-s3-adapter-sdk/dist/adapter";
import {NatureLanguage} from "kodo-s3-adapter-sdk/dist/uplog";

import {ClientOptions, createQiniuClient} from "@common/qiniu";

import {LocalPath, RemotePath, Status} from "./types";
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
    domain?: Domain,

    status: Status,
    message: string,

    prog: {
        total: number,
        loaded: number,
        resumable?: boolean, // what's difference from resumeDownload?
    },

    onStatusChange?: (status: Status) => void,
    onProgress?: (prog: DownloadJob["prog"]) => void,
}

type Options = RequiredOptions & Partial<OptionalOptions>

const DEFAULT_OPTIONS: OptionalOptions = {
    id: "",

    multipartDownloadThreshold: 100,
    multipartDownloadSize: 8,
    downloadSpeedLimit: 0, // 0 means no limit

    status: Status.Waiting,

    prog: {
        total: 0,
        loaded: 0,
        resumable: false,
    },

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
    prog: OptionalOptions["prog"],
    status: OptionalOptions["status"],
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
        }
    ): DownloadJob {
        return new DownloadJob({
            id,
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
        this.handlePartGet = this.handlePartGet.bind(this);
    }

    get uiData() {
        return {
            ...super.uiData,
            to: this.options.to,
        }
    }

    get persistInfo(): PersistInfo {
        return {
            // read-only info
            region: this.options.region,
            to: this.options.to,
            from: this.options.from,
            domain: this.options.domain,
            storageClasses: this.options.storageClasses,
            backendMode: this.options.clientOptions.backendMode,

            // real-time info
            prog: {
                loaded: this.prog.loaded,
                total: this.prog.total,
                resumable: this.prog.resumable
            },
            status: this.status,
            message: this.message,
            multipartDownloadThreshold: this.options.multipartDownloadThreshold,
            multipartDownloadSize: this.options.multipartDownloadSize,
        };
    }

    async start(): Promise<void> {
        if (this.status === Status.Running || this.status === Status.Finished) {
            return;
        }

        this.message = "";
        this._status = Status.Running;

        this.startSpeedCounter();

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
            if (err === Downloader.userCanceledError) {
                return;
            }
            this._status = Status.Failed;
            this.message = err.toString();
        });
    }

    private async startDownload(client: Adapter) {
        client.storageClasses = this.options.storageClasses;

        // check overwrite
        // the reason for overwrite when `this.prog.loaded > 0` is to allow
        // download from breakpoint to work properly.
        const isOverwrite = this.options.overwrite || this.prog.loaded > 0;
        this.tempFilePath = await DownloadJob.getTempFilePath(
            this.options.to.path,
            isOverwrite,
        );
        this.options.to.path = this.tempFilePath.slice(0, -DownloadJob.TempFileExt.length);

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
                recoveredFrom: this.prog.resumable
                    ? this.prog.loaded
                    : 0,
                partSize: this.options.multipartDownloadSize,
                chunkTimeout: 30000,
                retriesOnSameOffset: 10,
                downloadThrottleOption: this.options.downloadSpeedLimit
                    ? {
                        rate: this.options.downloadSpeedLimit,
                    }
                    : undefined,
                getCallback: {
                    headerCallback: this.handleHeader,
                    partGetCallback: this.handlePartGet,
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
        if (this.status === Status.Stopped) {
            return this;
        }
        this._status = Status.Stopped;

        if (this.options.isDebug) {
            console.log(`Pausing ${this.options.from.key}`);
        }

        if (!this.downloader) {
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

    protected handleStatusChange() {
        this.options.onStatusChange?.(this.status);
    }

    private handleProgress(downloaded: number, total: number): void {
        if (!this.downloader) {
            return;
        }
        this.prog.loaded = downloaded;
        this.prog.total = total;

        this.options.onProgress?.(lodash.merge({}, this.prog));

        this.speedCount(this.options.downloadSpeedLimit);
    }

    private handleHeader(_objectHeader: ObjectHeader): void {
        if (!this.downloader) {
            return;
        }
        // useless?
    }

    private handlePartGet(_partSize: number): void {
        if (!this.downloader) {
            return;
        }
        // useless?
    }
}
