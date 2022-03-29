import fs from "fs";
import { ipcRenderer } from "electron";
import { Region } from "kodo-s3-adapter-sdk";
import { StorageClass } from "kodo-s3-adapter-sdk/dist/adapter";
import { NatureLanguage } from "kodo-s3-adapter-sdk/dist/uplog";

import Duration from "@/const/duration";
import * as AppConfig from "@/const/app-config";

import { BackendMode, EventKey, IpcDownloadJob, IpcJobEvent, Status } from "./types";
import Base from "./base";
import * as Utils from "./utils";

interface RequiredOptions {
    clientOptions: {
        accessKey: string,
        secretKey: string,
        ucUrl: string,
        regions: Region[],
    },

    from: Utils.RemotePath,
    to: Utils.LocalPath
    region: string,
    backendMode: BackendMode,

    storageClasses: StorageClass[],

    userNatureLanguage: NatureLanguage,
}

interface OptionalOptions {
    domain?: string,

    maxConcurrency: number,
    resumeDownload: boolean,
    multipartDownloadThreshold: number,
    multipartDownloadSize: number,
    downloadSpeedLimit: number,

    status: Status,

    prog: {
        total: number,
        loaded: number,
        resumable: boolean, // what's difference from resumeDownload?
    },

    message: string,
    isDebug: boolean,
}

type Options = RequiredOptions & Partial<OptionalOptions>

const DEFAULT_OPTIONS: OptionalOptions = {
    maxConcurrency: 10,
    resumeDownload: false,
    multipartDownloadThreshold: 100,
    multipartDownloadSize: 8,
    downloadSpeedLimit: 0, // 0 means no limit

    status: Status.Waiting,

    prog: {
        total: 0,
        loaded: 0,
        // synced: 0,
        resumable: false,
    },

    message: "",
    isDebug: false,
};

export default class DownloadJob extends Base {
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

    constructor(config: Options) {
        super();
        this.id = `dj-${new Date().getTime()}-${Math.random().toString().substring(2)}`;
        this.kodoBrowserVersion = AppConfig.app.version;

        this.options = {
            ...DEFAULT_OPTIONS,
            ...config,
        };

        this.__status = this.options.status;

        this.prog = {
            ...this.options.prog,
            loaded: this.options.prog.loaded,
        };

        this.message = this.options.message;

        this.startDownload = this.startDownload.bind(this);
    }

    private set _status(value: Status) {
        this.__status = value;
        this.emit("statuschange", this.status);

        if (
            this.status === Status.Failed
            || this.status === Status.Stopped
            || this.status === Status.Finished
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

    private get tempfile(): string {
        return `${this.options.to.path}.download`;
    }

    private get ipcDownloadJob(): IpcDownloadJob {
        return {
            job: this.id,
            key: IpcJobEvent.Download,
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
                resumeDownload: this.options.resumeDownload,
                maxConcurrency: this.options.maxConcurrency,
                multipartDownloadThreshold: this.options.multipartDownloadThreshold * 1024 * 1024,
                multipartDownloadSize: this.options.multipartDownloadSize * 1024 * 1024,
                downloadSpeedLimit: this.options.downloadSpeedLimit,
                kodoBrowserVersion: this.kodoBrowserVersion,
            },
            params: {
                region: this.options.region,
                bucket: this.options.from.bucket,
                key: this.options.from.key,
                localFile: this.tempfile,
                domain: this.options.domain,
                isDebug: this.options.isDebug
            },
        }
    }

    start(prog?: OptionalOptions["prog"]): this {
        if (this.status === Status.Running || this.status === Status.Finished) {
            return this;
        }

        if (this.options.isDebug) {
            console.log(`Try downloading kodo://${this.options.from.bucket}/${this.options.from.key} to ${this.options.to.path}`);
        }

        this.message = "";
        this._status = Status.Running;

        const job = this.ipcDownloadJob
        job.params.downloadedBytes = prog?.loaded;

        if (this.options.isDebug) {
            console.log(`[JOB] ${JSON.stringify(job)}`);
        }
        ipcRenderer.on(this.id, this.startDownload);
        ipcRenderer.send("asynchronous-job", job);

        this.startSpeedCounter();

        return this;
    }

    stop(): this {
        if (this.status === Status.Stopped) {
            return this;
        }

        if (this.options.isDebug) {
            console.log(`Pausing kodo://${this.options.from.bucket}/${this.options.from.key}`);
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
        ipcRenderer.removeListener(this.id, this.startDownload);

        return this;
    }

    wait(): this {
        if (this.status === Status.Waiting) {
            return this;
        }
        if (this.options.isDebug) {
            console.log(`Pending kodo://${this.options.from.bucket}/${this.options.from.key}`);
        }

        this._status = Status.Waiting;
        this.emit("pause");

        return this;
    }

    startDownload(_event: any, data: any) {
        if (this.options.isDebug) {
            console.log("[IPC MAIN]", data);
        }

        switch (data.key) {
            case EventKey.Stat:
                this.prog.total = data.data.progressTotal;
                this.prog.resumable = data.data.progressResumable;
                this.emit("progress", this.prog);
                return
            case EventKey.Progress:
                this.prog.loaded = data.data.progressLoaded;
                this.prog.resumable = data.data.progressResumable;
                this.emit("progress", this.prog);
                return;
            case EventKey.PartDownloaded:
                this.prog.loaded = this.prog.loaded + data.data.size;
                this.emit("partcomplete", this.prog);
                return
            case EventKey.Downloaded:
                ipcRenderer.removeListener(this.id, this.startDownload);
                this._status = Status.Verifying;
                fs.rename(this.tempfile, this.options.to.path, err => {
                    if (err) {
                        console.error(`rename file ${this.tempfile} to ${this.options.to.path} error:`, err);

                        this._status = Status.Failed;
                        this.emit("error", err);
                    } else {
                        this._status = Status.Finished;
                        this.emit("complete");
                    }
                });
                return;
            case EventKey.Error:
                console.warn("download object error:", data);
                ipcRenderer.removeListener(this.id, this.startDownload);

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
                console.log("Unknown", data);
                return;
        }
    }

    startSpeedCounter() {
        const startAt = new Date().getTime();

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

            let avgSpeed = this.prog.loaded / (startAt - new Date().getTime()) * Duration.Second;
            this.speed = this.prog.loaded - lastLoaded;
            if (this.speed <= 0 || (lastSpeed / this.speed) > 1.1) {
                this.speed = lastSpeed * 0.95;
            }
            if (this.speed < avgSpeed) {
                this.speed = avgSpeed;
            }

            lastSpeed = this.prog.loaded;
            lastSpeed = this.speed;


            if (this.options.downloadSpeedLimit && this.speed > this.options.downloadSpeedLimit * 1024) {
                this.speed = this.options.downloadSpeedLimit * 1024;
            }
            this.emit("speedchange", this.speed * 1.2);

            this.predictLeftTime = this.speed <= 0
                ? 0
                : Math.floor((this.prog.total - this.prog.loaded) / this.speed * 1000);
        }, intervalDuration) as unknown as number; // hack type problem of nodejs and browser
    }

    getInfoForSave() {
        return {
            // read-only info
            storageClasses: this.options.storageClasses,
            region: this.options.region,
            to: this.options.to,
            from: this.options.from,
            backendMode: this.options.backendMode,
            domain: this.options.domain,

            // real-time info
            prog: {
                loaded: this.prog.loaded,
                total: this.prog.total,
                resumable: this.prog.resumable
            },
            status: this.status,
            message: this.message,
        };
    }

    tryCleanupDownloadFile(): this {
        if ([Status.Finished, Status.Waiting].includes(this.status)) {
            return this;
        }
        try {
            fs.unlinkSync(this.tempfile);
        } catch (_err) {
            // ignore error
        }
        return this;
    }
}
