import {promises as fsPromises} from "fs";

// @ts-ignore
import mime from "mime";
import lodash from "lodash";
import {Uploader} from "kodo-s3-adapter-sdk";
import {Adapter, Part, StorageClass} from "kodo-s3-adapter-sdk/dist/adapter";
import {RecoveredOption} from "kodo-s3-adapter-sdk/dist/uploader";
import {NatureLanguage} from "kodo-s3-adapter-sdk/dist/uplog";

import {ClientOptions, createQiniuClient} from "@common/qiniu";
import ByteSize from "@common/const/byte-size";

import {LocalPath, RemotePath, Status, UploadedPart} from "./types";
import TransferJob from "./transfer-job";
import crc32Async from "@common/models/job/crc32";

// if change options, remember to check `get persistInfo()`
interface RequiredOptions {
    clientOptions: ClientOptions,

    from: Required<LocalPath>,
    to: RemotePath,
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

interface OptionalOptions extends UploadOptions {
    id: string,
    uploadedId: string,
    uploadedParts: UploadedPart[],

    status: Status,
    message: string,

    prog: {
        total: number, // Bytes
        loaded: number, // Bytes
        resumable?: boolean,
    },

    onStatusChange?: (status: Status) => void,
    onProgress?: (prog: UploadJob["prog"]) => void,
    onPartCompleted?: (part: Part) => void,
    onCompleted?: () => void,
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

export default class UploadJob extends TransferJob {
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
    protected readonly options: Readonly<RequiredOptions & OptionalOptions>
    private isForceOverwrite: boolean = false

    // - for resume from break point -
    uploadedId: string
    uploadedParts: UploadedPart[]

    // - for process control -
    uploader?: Uploader

    constructor(config: Options) {
        super(config)

        this.options = lodash.merge({}, DEFAULT_OPTIONS, config);

        this.uploadedId = this.options.uploadedId;
        this.uploadedParts = [
            ...this.options.uploadedParts,
        ];

        // hook functions
        this.startUpload = this.startUpload.bind(this);
        this.handleStatusChange = this.handleStatusChange.bind(this);
        this.handleProgress = this.handleProgress.bind(this);
        this.handlePartsInit = this.handlePartsInit.bind(this);
        this.handlePartPutted = this.handlePartPutted.bind(this);
    }

    get uiData() {
        return {
            ...super.uiData,
            from: this.options.from,
        };
    }

    async start(
        options?: {
            forceOverwrite: boolean
        },
    ): Promise<void> {
        if (this.status === Status.Running || this.status === Status.Finished) {
            return;
        }

        this.message = "";
        this._status = Status.Running;

        this.startSpeedCounter();

        if (options?.forceOverwrite) {
            this.isForceOverwrite = true;
        }

        if (this.options.isDebug) {
            console.log(`Try uploading ${this.options.from.path} to kodo://${this.options.to.bucket}/${this.options.to.key}`);
        }

        // create client
        const qiniuClient = createQiniuClient(this.options.clientOptions, {
            userNatureLanguage: this.options.userNatureLanguage,
            isDebug: this.options.isDebug,
        });

        // upload
        await qiniuClient.enter(
            "uploadFile",
            this.startUpload,
            {
                targetBucket: this.options.to.bucket,
                targetKey: this.options.to.key,
            },
        ).catch(err => {
            if (err === Uploader.userCanceledError) {
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
        const fileCrc32Hex = await crc32Async(this.options.from.path);
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
                crc32: parseInt(fileCrc32Hex, 16).toString(),
                header: {
                    contentType: mime.getType(this.options.from.path),
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
        this.options.onCompleted?.();
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

    protected handleStatusChange() {
        this.options.onStatusChange?.(this.status);
    }

    private handleProgress(uploaded: number, total: number) {
        if (!this.uploader) {
            return;
        }
        this.prog.loaded = uploaded;
        this.prog.total = total;

        this.options.onProgress?.(lodash.merge({}, this.prog));

        this.speedCount(this.options.uploadSpeedLimit);
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

        this.options.onPartCompleted?.(lodash.merge({}, part));
    }
}
