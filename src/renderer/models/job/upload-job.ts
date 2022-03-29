import { ipcRenderer } from "electron";
import { Region } from "kodo-s3-adapter-sdk";
import { StorageClass } from "kodo-s3-adapter-sdk/dist/adapter";
import { NatureLanguage } from "kodo-s3-adapter-sdk/dist/uplog";

import Duration from "@/const/duration";
import * as AppConfig from "@/const/app-config";

import { BackendMode, EventKey, IpcUploadJob, IpcJobEvent, Status, UploadedPart } from "./types";
import Base from "./base"
import * as Utils from "./utils";

// if change options, remember to check toJsonString()
interface RequiredOptions {
    clientOptions: {
        accessKey: string,
        secretKey: string,
        ucUrl: string,
        regions: Region[],
    },

    from: Utils.LocalPath,
    to: Utils.RemotePath,
    region: string,
    backendMode: BackendMode,

    overwrite: boolean,
    storageClassName: StorageClass["kodoName"],
    storageClasses: StorageClass[],

    userNatureLanguage: NatureLanguage,
}

interface OptionalOptions {
    maxConcurrency: number,
    resumeUpload: boolean,
    multipartUploadThreshold: number,
    multipartUploadSize: number,
    uploadSpeedLimit: number,
    uploadedId: string,
    uploadedParts: UploadedPart[],

    status: Status,

    prog: {
        total: number,
        loaded: number,
        resumable?: boolean,
    },

    message: string,
    isDebug: boolean,
}

export type Options = RequiredOptions & Partial<OptionalOptions>

const DEFAULT_OPTIONS: OptionalOptions = {
    maxConcurrency: 10,
    resumeUpload: false,
    multipartUploadThreshold: 100,
    multipartUploadSize: 8,
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
};

export default class UploadJob extends Base {
    // - create options -
    private readonly options: RequiredOptions & OptionalOptions

    // - for job save and log -
    readonly id: string
    readonly kodoBrowserVersion: string

    // - for UI -
    private __status: Status
    // speed
    speedTimerId?: number = undefined
    speed: number = 0
    predictLeftTime: number = 0
    // message
    message: string

    // - for resume from break point -
    prog: OptionalOptions["prog"]
    uploadedId: string
    uploadedParts: UploadedPart[]

    constructor(config: Options) {
        super();
        this.id = `uj-${new Date().getTime()}-${Math.random().toString().substring(2)}`
        this.kodoBrowserVersion = AppConfig.app.version;

        this.options = {
            ...DEFAULT_OPTIONS,
            ...config,
        }

        this.__status = this.options.status;

        this.prog = {
            ...this.options.prog,
        }
        this.uploadedId = this.options.uploadedId;
        this.uploadedParts = [
            ...this.options.uploadedParts,
        ];

        this.message = this.options.message;

        this.startUpload = this.startUpload.bind(this);
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
            clearInterval(this.speedTimerId);

            this.speed = 0;
            this.predictLeftTime = 0;
        }
    }

    get status(): Status {
        return this.__status
    }

    get isStopped(): boolean {
        return this.status !== Status.Running;
    }

    private get ipcUploadJob(): IpcUploadJob {
        return {
            job: this.id,
            key: IpcJobEvent.Upload,
            clientOptions: {
                ...this.options.clientOptions,
                // if ucUrl is not undefined, downloader will use it generator url
                ucUrl: this.options.clientOptions.ucUrl === ''
                    ? undefined
                    : this.options.clientOptions.ucUrl,
                backendMode: this.options.backendMode,

                userNatureLanguage: this.options.userNatureLanguage,
            },
            options: {
                resumeUpload: this.options.resumeUpload,
                maxConcurrency: this.options.maxConcurrency,
                multipartUploadThreshold: this.options.multipartUploadThreshold * 1024 * 1024,
                multipartUploadSize: this.options.multipartUploadSize * 1024 * 1024,
                uploadSpeedLimit: this.options.uploadSpeedLimit,
                kodoBrowserVersion: this.kodoBrowserVersion,
            },
            params: {
                region: this.options.region,
                bucket: this.options.to.bucket,
                key: this.options.to.key,
                localFile: this.options.from.path,
                overwriteDup: this.options.overwrite,
                storageClassName: this.options.storageClassName,
                storageClasses: this.options.storageClasses,
                isDebug: this.options.isDebug,
            }
        }
    }

    start(
        forceOverwrite: boolean = false,
        prog?: { // not same as Options["prog"]
            uploadedId: string,
            uploadedParts: UploadedPart[]
        },
    ): this {
        if (this.status === Status.Running || this.status === Status.Finished) {
            return this;
        }

        if (this.options.isDebug) {
            console.log(`Try uploading ${this.options.from.path} to kodo://${this.options.to.bucket}/${this.options.to.key}`);
        }

        this.message = ""

        this._status = Status.Running;

        const job = this.ipcUploadJob;
        if (forceOverwrite) {
            job.params.overwriteDup = true;
        }
        if (prog) {
            job.params.uploadedId = prog.uploadedId;
            job.params.uploadedParts = prog.uploadedParts;
        }

        if (this.options.isDebug) {
            console.log(`[JOB] sched starting => ${JSON.stringify(job)}`)
        }

        ipcRenderer.on(this.id, this.startUpload);
        ipcRenderer.send("asynchronous-job", job);

        this.startSpeedCounter();

        return this;
    }

    stop(): this {
        if (this.status === Status.Stopped) {
            return this;
        }

        if (this.options.isDebug) {
            console.log(`Pausing ${this.options.from.path}`);
        }

        clearInterval(this.speedTimerId);

        this.speed = 0;
        this.predictLeftTime = 0;

        this._status = Status.Stopped;
        this.emit("stop");

        ipcRenderer.send("asynchronous-job", {
            job: this.id,
            key: IpcJobEvent.Stop,
        });
        ipcRenderer.removeListener(this.id, this.startUpload);

        return this;
    }

    wait(): this {
        if (this.status === Status.Waiting) {
            return this;
        }

        if (this.options.isDebug) {
            console.log(`Pending ${this.options.from.path}`);
        }

        this._status = Status.Waiting;
        this.emit("pause");

        return this;
    }

    startUpload(_: any, data: any) {
        if (this.options.isDebug) {
            console.log("[IPC MAIN]", data);
        }

        switch (data.key) {
            case EventKey.Duplicated:
                ipcRenderer.removeListener(this.id, this.startUpload);
                this._status = Status.Duplicated;
                this.emit("fileDuplicated", data);
                return;
            case EventKey.Stat:
                this.prog.total = data.data.progressTotal;
                this.prog.resumable = data.data.progressResumable;
                this.emit("progress", this.prog);
                return;
            case EventKey.Progress:
                this.prog.loaded = data.data.progressLoaded;
                this.prog.resumable = data.data.progressResumable;
                this.emit("progress", this.prog);
                return;
            case EventKey.PartUploaded:
                this.emit("partcomplete", data.data);
                return;
            case EventKey.Uploaded:
                ipcRenderer.removeListener(this.id, this.startUpload);

                this._status = Status.Finished;
                this.emit("complete");
                return;
            case EventKey.Error:
                console.error("upload object error:", data);
                ipcRenderer.removeListener(this.id, this.startUpload);

                this.message = data;
                this._status = Status.Failed;
                this.emit("error", data.error);
                return;
            case EventKey.Debug:
                if (!this.options.isDebug) {
                    console.log("Debug", data);
                }
                return;
            default:
                console.warn("Unknown", data);
                return;
        }
    }

    private startSpeedCounter() {
        const startedAt = new Date().getTime();

        let lastLoaded = this.prog.loaded;
        let lastSpeed = 0;

        clearInterval(this.speedTimerId);
        const intervalDuration = Duration.Second;
        this.speedTimerId = setInterval(() => {
            if (this.isStopped) {
                this.speed = 0;
                this.predictLeftTime = 0;
                return;
            }

            const avgSpeed = this.prog.loaded / (new Date().getTime() - startedAt) * Duration.Second;
            this.speed = this.prog.loaded - lastLoaded;
            if (this.speed <= 0 || (lastSpeed / this.speed) > 1.1) {
                this.speed = lastSpeed * 0.95;
            }
            if (this.speed < avgSpeed) {
                this.speed = avgSpeed;
            }

            lastLoaded = this.prog.loaded;
            lastSpeed = this.speed;


            if (this.options.uploadSpeedLimit && this.speed > this.options.uploadSpeedLimit * 1024) {
                this.speed = this.options.uploadSpeedLimit * 1024;
            }
            this.emit('speedchange', this.speed * 1.2);

            this.predictLeftTime = this.speed <= 0
                ? 0
                : Math.floor((this.prog.total - this.prog.loaded) / this.speed * 1000);
        }, intervalDuration) as unknown as number; // hack type problem of nodejs and browser
    }

    getInfoForSave({
        from
    }: {
        from?: {
            size?: number,
            mtime?: number,
        }
    }) {
        return {
            from: {
                ...this.options.from,
                ...from,
            },

            // read-only info
            storageClasses: this.options.storageClasses,
            region: this.options.region,
            to: this.options.to,
            overwrite: this.options.overwrite,
            storageClassName: this.options.storageClassName,
            backendMode: this.options.backendMode,

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
                return { PartNumber: part.partNumber, ETag: part.etag };
            }),
        };
    }
}

