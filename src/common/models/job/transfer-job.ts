import lodash from "lodash";
import {NatureLanguage} from "kodo-s3-adapter-sdk/dist/uplog";

import Duration from "@common/const/duration";
import {ClientOptions} from "@common/qiniu";

import {LocalPath, ProgressCallbackParams, RemotePath, Status} from "./types";

interface RequiredOptions {
    clientOptions: ClientOptions,

    from: LocalPath | RemotePath
    to: LocalPath | RemotePath
    region: string,
}

interface OptionalOptions {
    id: string,

    status: Status,
    message: string,
    prog: {
        total: number, // Bytes
        loaded: number, // Bytes
        resumable?: boolean,
    },
    timeoutBaseDuration: number, // ms
    retry: number,

    userNatureLanguage: NatureLanguage,
}

export type Options = RequiredOptions & Partial<OptionalOptions>

const DEFAULT_OPTIONS: OptionalOptions = {
    id: "",

    status: Status.Waiting,
    message: "",
    prog: {
        total: 0,
        loaded: 0,
    },
    timeoutBaseDuration: 3 * Duration.Second,
    retry: 3,

    userNatureLanguage: "zh-CN",
}

export default abstract class TransferJob {
    protected readonly options: Readonly<RequiredOptions & OptionalOptions>
    protected retriedTimes: number = 0

    readonly id: string

    // - for UI -
    private __status: Status
    // speed
    protected speed: number = 0 // Bytes/s
    protected estimatedDuration: number = 0 // timestamp
    // message
    message: string

    // - for resume from break point -
    prog: OptionalOptions["prog"]

    protected constructor(config: Options) {
        this.id = config.id
            ? config.id
            : `j-${Date.now()}-${Math.random().toString().substring(2)}`;

        this.options = lodash.merge({}, DEFAULT_OPTIONS, config);

        this.__status = this.options.status;
        this.message = this.options.message;

        this.prog = {
            ...this.options.prog,
        }
    }

    get status(): Status {
        return this.__status;
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
            message: this.message,
            progress: this.prog,
            speed: this.speed,
            estimatedTime: Date.now() + this.estimatedDuration,
            estimatedDuration: this.estimatedDuration,
        }
    }


    abstract start(options?: any): Promise<void>
    abstract stop(): this
    abstract wait(options?: any): this
    protected abstract retry(): Promise<void>
    abstract get persistInfo(): any

    protected abstract handleStatusChange(status: Status, prev: Status): void

    protected get shouldRetry(): boolean {
        return this.retriedTimes < this.options.retry;
    }

    // TypeScript specification (8.4.3) says...
    // > Accessors for the same member name must specify the same accessibility
    protected set _status(value: Status) {
        const prev = this.__status;
        this.__status = value;
        this.handleStatusChange(value, prev);
    }

    protected handleProgress({
      transferred,
      total,
      speed,
      eta,
    }: ProgressCallbackParams) {
      if (this.isNotRunning) {
        return;
      }
      this.prog.loaded = transferred;
      this.prog.total = total;
      this.speed = speed * 1000; // Bytes/ms -> Bytes/s
      this.estimatedDuration = eta;
    }

    protected async backoff() {
        const backoffDuration = Math.min(
            this.options.timeoutBaseDuration << this.retriedTimes,
            Duration.Minute,
        )
        await new Promise(resolve => setTimeout(resolve, backoffDuration));
    }
}
