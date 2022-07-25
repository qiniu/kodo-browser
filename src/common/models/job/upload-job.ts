import {promises as fsPromises} from "fs";

// @ts-ignore
import mime from "mime";
import lodash from "lodash";
import {Qiniu, Region, Uploader} from "kodo-s3-adapter-sdk";
import {Adapter, Part, StorageClass} from "kodo-s3-adapter-sdk/dist/adapter";
import {RecoveredOption} from "kodo-s3-adapter-sdk/dist/uploader";
import {NatureLanguage} from "kodo-s3-adapter-sdk/dist/uplog";

import Duration from "@common/const/duration";
import ByteSize from "@common/const/byte-size";
import * as AppConfig from "@common/const/app-config";

import {BackendMode, Status, UploadedPart} from "./types";
import Base from "./base"
import * as Utils from "./utils";

// if change options, remember to check PersistInfo
interface RequiredOptions {
    clientOptions: {
        accessKey: string,
        secretKey: string,
        ucUrl: string,
        regions: Region[],
        backendMode: BackendMode,
    },

    from: Required<Utils.LocalPath>,
    to: Utils.RemotePath,
    region: string,

    overwrite: boolean,
    storageClassName: StorageClass["kodoName"],
    storageClasses: StorageClass[],
}

interface UploadOptions {
    multipartUploadThreshold: number, // Bytes
    multipartUploadSize: number, // Bytes
    uploadSpeedLimit: number, // Bytes/s

    isDebug: boolean,

    // could be removed if there is a better uplog
    userNatureLanguage: NatureLanguage,
}

interface OptionalOptions extends UploadOptions{
    id: string,
    uploadedId: string,
    uploadedParts: UploadedPart[],

    status: Status,

    prog: {
        total: number, // Bytes
        loaded: number, // Bytes
        resumable?: boolean,
    },

    message: string,
}

export type Options = RequiredOptions & Partial<OptionalOptions>

const DEFAULT_OPTIONS: OptionalOptions = {
    id: "",

    multipartUploadThreshold: 10 * ByteSize.MB,
    multipartUploadSize: 4 * ByteSize.MB,
    uploadSpeedLimit: 0, // 0 means no limit
    uploadedId: "",
    uploadedParts: [],

    status: Status.Waiting,

    prog: {
        total: 0,
        loaded: 0,
    },

    message: "",
    isDebug: false,

    userNatureLanguage: "zh-CN",
};

type PersistInfo = {
    from: RequiredOptions["from"],
    storageClasses: RequiredOptions["storageClasses"],
    region: RequiredOptions["region"],
    to: RequiredOptions["to"],
    overwrite: RequiredOptions["overwrite"],
    storageClassName: RequiredOptions["storageClassName"],
    // Q: if we can remove backendMode?
    // Be client backendMode.
    // A: It seems no problems, because backendMode is invariant in business logic.
    // But It's also a risk, if business logic changes. Because we may get errors
    // when restart job from break point with different backendMode.
    backendMode: RequiredOptions["clientOptions"]["backendMode"],
    prog: OptionalOptions["prog"],
    status: OptionalOptions["status"],
    message: OptionalOptions["message"],
    uploadedId: OptionalOptions["uploadedId"],
    // ugly. if we can do some break changes, make it be
    // `uploadedParts: OptionalOptions["uploadedParts"],`
    uploadedParts: {
        PartNumber: UploadedPart["partNumber"],
        ETag: UploadedPart["etag"],
    }[],
    multipartUploadThreshold: OptionalOptions["multipartUploadThreshold"],
    multipartUploadSize: OptionalOptions["multipartUploadSize"],
}

export default class UploadJob extends Base {
    static fromPersistInfo(
        id: string,
        persistInfo: PersistInfo,
        clientOptions: RequiredOptions["clientOptions"],
        uploadOptions: {
            uploadSpeedLimit: number,
            isDebug: boolean,
            userNatureLanguage: NatureLanguage,
        },
    ): UploadJob {
        return new UploadJob({
            id,
            status: persistInfo.status,
            message: persistInfo.message,

            from: persistInfo.from,
            to: persistInfo.to,
            prog: persistInfo.prog,

            clientOptions,
            storageClasses: persistInfo.storageClasses,

            overwrite: persistInfo.overwrite,
            region: persistInfo.region,
            storageClassName: persistInfo.storageClassName,

            uploadedId: persistInfo.uploadedId,
            uploadedParts: persistInfo.uploadedParts.map(part => ({
                partNumber: part.PartNumber,
                etag: part.ETag,
            })),

            multipartUploadThreshold: persistInfo.multipartUploadThreshold,
            multipartUploadSize: persistInfo.multipartUploadSize,
            uploadSpeedLimit: uploadOptions.uploadSpeedLimit,
            isDebug: uploadOptions.isDebug,

            userNatureLanguage: uploadOptions.userNatureLanguage,
        });
    }

    // - create options -
    private readonly options: Readonly<RequiredOptions & OptionalOptions>

    // - for job save and log -
    readonly id: string
    readonly kodoBrowserVersion: string
    private isForceOverwrite: boolean = false

    // - for UI -
    private __status: Status
    // speed
    speedTimerId?: number = undefined
    speed: number = 0 // Bytes/s
    predictLeftTime: number = 0 // seconds
    // message
    message: string

    // - for resume from break point -
    prog: OptionalOptions["prog"]
    uploadedId: string
    uploadedParts: UploadedPart[]

    // - for process control -
    uploader?: Uploader

    constructor(config: Options) {
        super();
        this.id = config.id
            ? config.id
            : `uj-${new Date().getTime()}-${Math.random().toString().substring(2)}`;
        this.kodoBrowserVersion = AppConfig.app.version;

        this.options = lodash.merge({}, DEFAULT_OPTIONS, config);

        this.__status = this.options.status;

        this.prog = {
            ...this.options.prog,
        }
        this.uploadedId = this.options.uploadedId;
        this.uploadedParts = [
            ...this.options.uploadedParts,
        ];

        this.message = this.options.message;

        // hook functions
        this.startUpload = this.startUpload.bind(this);
        this.handleProgress = this.handleProgress.bind(this);
        this.handlePartsInit = this.handlePartsInit.bind(this);
        this.handlePartPutted = this.handlePartPutted.bind(this);
    }

    get accessKey(): string {
        return this.options.clientOptions.accessKey;
    }

    // TypeScript specification (8.4.3) says...
    // > Accessors for the same member name must specify the same accessibility
    private set _status(value: Status) {
        this.__status = value;
        this.emit("statuschange", this.status);

        if (
            this.status === Status.Failed
            || this.status === Status.Stopped
            || this.status === Status.Finished
            || this.status === Status.Duplicated
        ) {
            this.stopSpeedCounter();
        }
    }

    get status(): Status {
        return this.__status
    }

    get isNotRunning(): boolean {
        return this.status !== Status.Running;
    }

    get uiData() {
        return {
            id: this.id,
            from: this.options.from,
            to: this.options.to,
            status: this.status,
            speed: this.speed,
            estimatedTime: this.predictLeftTime,
            progress: this.prog,
            message: this.message,
        }
    }

    async start(
        forceOverwrite: boolean = false,
    ): Promise<void> {
        if (this.status === Status.Running || this.status === Status.Finished) {
            return;
        }

        if (forceOverwrite) {
            this.isForceOverwrite = true;
        }

        if (this.options.isDebug) {
            console.log(`Try uploading ${this.options.from.path} to kodo://${this.options.to.bucket}/${this.options.to.key}`);
        }

        this.message = ""

        this._status = Status.Running;

        // create client
        const qiniu = new Qiniu(
            this.options.clientOptions.accessKey,
            this.options.clientOptions.secretKey,
            this.options.clientOptions.ucUrl,
            `Kodo-Browser/${this.kodoBrowserVersion}/ioutil`,
            this.options.clientOptions.regions,
        );
        const qiniuClient = qiniu.mode(
            this.options.clientOptions.backendMode,
            {
                appName: 'kodo-browser/ioutil',
                appVersion: this.kodoBrowserVersion,
                appNatureLanguage: this.options.userNatureLanguage,
                // disable uplog when use customize cloud
                // because there isn't a valid access key of uplog
                uplogBufferSize: this.options.clientOptions.ucUrl ? -1 : undefined,
                requestCallback: () => {
                },
                responseCallback: () => {
                },
            },
        );

        // upload
        this.startSpeedCounter();
        await qiniuClient.enter(
            "uploadFile",
            this.startUpload,
            {
                targetBucket: this.options.to.bucket,
                targetKey: this.options.to.key,
            },
        ).catch(err => {
            if (err === Uploader.userCanceledError) {
                this._status = Status.Stopped;
                return;
            }
            this._status = Status.Failed;
            this.message = err.toString();
        });
    }

    private async startUpload(client: Adapter) {
        client.storageClasses = this.options.storageClasses;

        // check overwrite
        const isOverwrite = this.isForceOverwrite || this.options.overwrite;
        if (!isOverwrite) {
            const isExists = await client.isExists(
                this.options.region,
                {
                    bucket: this.options.to.bucket,
                    key: this.options.to.key,
                },
            );
            if (isExists) {
                this._status = Status.Duplicated;
                return;
            }
        }

        // upload
        this.uploader = new Uploader(client);
        const fileHandle = await fsPromises.open(this.options.from.path, "r");
        await this.uploader.putObjectFromFile(
            this.options.region,
            {
                bucket: this.options.to.bucket,
                key: this.options.to.key,
                storageClassName: this.options.storageClassName,
            },
            fileHandle,
            this.options.from.size,
            this.options.from.name,
            {
                header: {
                    contentType: mime.getType(this.options.from.path)
                },
                recovered: this.uploadedId && this.uploadedParts
                    ? {
                        uploadId: this.uploadedId,
                        parts: this.uploadedParts,
                    }
                    : undefined,
                uploadThreshold: this.options.multipartUploadThreshold,
                partSize: this.options.multipartUploadSize,
                putCallback: {
                    partsInitCallback: this.handlePartsInit,
                    partPutCallback: this.handlePartPutted,
                    progressCallback: this.handleProgress,
                },
                uploadThrottleOption: this.options.uploadSpeedLimit > 0
                    ? {
                        rate: this.options.uploadSpeedLimit,
                    }
                    : undefined,
            }
        );
        this._status = Status.Finished;

        await fileHandle.close();
        this.emit("complete");
    }

    stop(): this {
        if (this.status === Status.Stopped) {
            return this;
        }
        this._status = Status.Stopped;

        if (this.options.isDebug) {
            console.log(`Pausing ${this.options.from.path}`);
        }

        if (!this.uploader) {
            return this;
        }
        this.uploader.abort();
        this.uploader = undefined;

        return this;
    }

    wait(): this {
        if (this.status === Status.Waiting) {
            return this;
        }
        this._status = Status.Waiting;

        if (this.options.isDebug) {
            console.log(`Pending ${this.options.from.path}`);
        }

        if (!this.uploader) {
            return this;
        }
        this.uploader.abort();
        this.uploader = undefined;

        return this;
    }

    private startSpeedCounter() {
        this.stopSpeedCounter();

        let lastTimestamp = new Date().getTime();
        let lastLoaded = this.prog.loaded;
        let zeroSpeedCounter = 0;
        const intervalDuration = Duration.Second;
        this.speedTimerId = setInterval(() => {
            if (this.isNotRunning) {
                this.stopSpeedCounter();
                return;
            }

            const nowTimestamp = new Date().getTime();
            const currentSpeed = (this.prog.loaded - lastLoaded) / ((nowTimestamp - lastTimestamp) / Duration.Second);
            if (currentSpeed < 1 && zeroSpeedCounter < 3) {
                zeroSpeedCounter += 1;
                return;
            }

            this.speed = Math.round(currentSpeed);
            this.predictLeftTime = Math.max(
                Math.round((this.prog.total - this.prog.loaded) / this.speed) * Duration.Second,
                0,
            );

            lastLoaded = this.prog.loaded;
            lastTimestamp = nowTimestamp;
            zeroSpeedCounter = 0;
        }, intervalDuration) as unknown as number; // hack type problem of nodejs and browser
    }

    private stopSpeedCounter() {
        this.speed = 0;
        this.predictLeftTime = 0;
        clearInterval(this.speedTimerId);
    }

    private handleProgress(uploaded: number, total: number) {
        if (!this.uploader) {
            return;
        }
        this.prog.loaded = uploaded;
        this.prog.total = total;

        this.emit("progress", lodash.merge({}, this.prog));
    }

    private handlePartsInit(initInfo: RecoveredOption) {
        this.uploadedId = initInfo.uploadId;
        this.uploadedParts = initInfo.parts;
    }

    private handlePartPutted(part: Part) {
        if (!this.uploader) {
            return;
        }
        this.uploadedParts.push(part);

        this.emit("partcomplete", lodash.merge({}, part));
    }

    get persistInfo(): PersistInfo {
        return {
            from: this.options.from,
            storageClasses: this.options.storageClasses,
            region: this.options.region,
            to: this.options.to,
            overwrite: this.options.overwrite,
            storageClassName: this.options.storageClassName,
            backendMode: this.options.clientOptions.backendMode,

            // real-time info
            prog: {
                loaded: this.prog.loaded,
                total: this.prog.total,
                resumable: this.prog.resumable
            },
            status: this.status,
            message: this.message,
            uploadedId: this.uploadedId,
            uploadedParts: this.uploadedParts.map((part) => {
                return {PartNumber: part.partNumber, ETag: part.etag};
            }),
            multipartUploadThreshold: this.options.multipartUploadThreshold,
            multipartUploadSize: this.options.multipartUploadSize,
        };
    }
}
