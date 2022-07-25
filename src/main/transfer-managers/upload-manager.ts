import path from "path";
import fs, {Stats} from "fs";

import lodash from "lodash";
// @ts-ignore
import Walk from "@root/walk";
import {Adapter} from "kodo-s3-adapter-sdk/dist/adapter";

import {ClientOptions, createQiniuClient} from "@common/qiniu";
import {DestInfo, UploadOptions} from "@common/ipc-actions/upload";
import UploadJob from "@common/models/job/upload-job";
import {Status} from "@common/models/job/types";

import {MAX_MULTIPART_COUNT, MIN_MULTIPART_SIZE} from "./boundary-const";
import TransferManager, {TransferManagerConfig} from "./transfer-manager";

// for walk
interface StatsWithName extends Stats {
    name: string,
}

interface Config {
    isSkipEmptyDirectory: boolean;

    onCreatedDirectory?: (bucket: string, directoryKey: string) => void,
}

export default class UploadManager extends TransferManager<UploadJob, Config> {
    constructor(config: TransferManagerConfig<UploadJob, Config>) {
        super(config);
    }

    async createUploadJobs(
        filePathnameList: string[], // local file path, required absolute path
        destInfo: DestInfo,
        clientOptions: ClientOptions,
        uploadOptions: UploadOptions,
        hooks?: {
            jobsAdding?: () => void,
            jobsAdded?: () => void,
        },
    ) {
        const qiniuClient = createQiniuClient(
            clientOptions,
            {
                userNatureLanguage: uploadOptions.userNatureLanguage,
                isDebug: this.config.isDebug,
            },
        );
        const walk = Walk.create({
            withFileStats: true,
        });

        for (const filePathname of filePathnameList) {
            const directoryToCreate = new Map<string, boolean>();
            const remoteBaseDirectory = destInfo.key.endsWith("/")
                ? destInfo.key.slice(0, -1)
                : destInfo.key;
            const localBaseDirectory = path.dirname(filePathname);

            await walk(
                filePathname,
                async (err: Error, walkingPathname: string, statsWithName: StatsWithName): Promise<void> => {
                    if (err) {
                        this.config.onError?.(err);
                        return;
                    }

                    // remoteKey should be "path/to/file" not "/path/to/file"
                    let remoteKey = remoteBaseDirectory + walkingPathname.slice(localBaseDirectory.length);
                    // for windows path
                    if (path.sep === "\\") {
                        remoteKey = remoteKey.replace(/\\/g, "/");
                    }
                    remoteKey = remoteKey.startsWith("/") ? remoteKey.slice(1) : remoteKey;

                    // if enable skip empty directory upload.
                    const remoteDirectoryKey = path.dirname(remoteKey) + "/";
                    if (remoteDirectoryKey !== "./" && !directoryToCreate.get(remoteDirectoryKey)) {
                        this.createDirectory(
                            qiniuClient,
                            {
                                region: destInfo.regionId,
                                bucketName: destInfo.bucketName,
                                key: remoteDirectoryKey,
                                directoryName: path.basename(remoteDirectoryKey),
                            },
                        )
                            .then(data => this.afterCreateDirectory(data));
                        directoryToCreate.set(remoteDirectoryKey, true);
                    }

                    if (statsWithName.isDirectory()) {
                        //  we need to determine whether the directory is empty.
                        //  and in this electron version(nodejs v10.x) read the directory again
                        //  is too waste. so we create later.
                        //  if we are nodejs > v12.12，use opendir API to determine empty.
                        if (!this.config.isSkipEmptyDirectory) {
                            const remoteDirectoryKey = remoteKey + "/";
                            this.createDirectory(
                                qiniuClient,
                                {
                                    region: destInfo.regionId,
                                    bucketName: destInfo.bucketName,
                                    key: remoteDirectoryKey,
                                    directoryName: statsWithName.name,
                                },
                            )
                                .then(data => this.afterCreateDirectory(data));
                            directoryToCreate.set(remoteDirectoryKey, true);
                        }
                    } else if (statsWithName.isFile()) {
                        const from = {
                            name: statsWithName.name,
                            path: walkingPathname,
                            size: statsWithName.size,
                            mtime: statsWithName.mtime.getTime(),
                        };
                        const to = {
                            bucket: destInfo.bucketName,
                            key: remoteKey,
                        };
                        this.createUploadJob(from, to, clientOptions, uploadOptions, destInfo.regionId);

                        // post add job
                        hooks?.jobsAdding?.();
                        this.scheduleJobs();
                    } else {
                        console.warn("file can't upload", "local:", walkingPathname, "remoteKey:", remoteKey);
                    }
                },
            );
        }
        hooks?.jobsAdded?.();
    }

    private async createDirectory(
        client: Adapter,
        options: {
            region: string,
            bucketName: string,
            key: string,
            directoryName: string,
        },
    ) {
        await client.enter("createFolder", async client => {
            await client.putObject(
                options.region,
                {
                    bucket: options.bucketName,
                    key: options.key,
                },
                Buffer.alloc(0),
                options.directoryName,
            );
        }, {
            targetBucket: options.bucketName,
            targetKey: options.key,
        });
        return {
            bucket: options.bucketName,
            key: options.key,
        };
    }

    private createUploadJob(
        from: Required<UploadJob["options"]["from"]>,
        to: UploadJob["options"]["to"],
        clientOptions: ClientOptions,
        uploadOptions: UploadOptions,
        regionId: string,
    ): void {
        // parts count
        const partsCount = Math.ceil(from.size / this.config.multipartSize);

        // part size
        let partSize = this.config.multipartSize;
        if (partsCount > MAX_MULTIPART_COUNT) {
            partSize = Math.ceil(from.size / MAX_MULTIPART_COUNT);
            if (partSize < MIN_MULTIPART_SIZE) {
                partSize = MIN_MULTIPART_SIZE
            } else {
                // Why?
                partSize += MIN_MULTIPART_SIZE - partSize % MIN_MULTIPART_SIZE
            }
        }

        const job = new UploadJob({
            from: from,
            to: to,
            prog: {
                loaded: 0,
                total: from.size,
                resumable: this.config.resumable && from.size > this.config.multipartThreshold,
            },

            clientOptions,
            storageClasses: uploadOptions.storageClasses,

            overwrite: uploadOptions.isOverwrite,
            region: regionId,
            storageClassName: uploadOptions.storageClassName,

            multipartUploadThreshold: this.config.multipartThreshold,
            multipartUploadSize: partSize,
            uploadSpeedLimit: this.config.speedLimit,
            isDebug: this.config.isDebug,

            userNatureLanguage: uploadOptions.userNatureLanguage,

            onProgress: () => {
                this.persistJobs();
            },
            onPartCompleted: () => {
                this.persistJobs();
            },
            onCompleted: () => {
                this.persistJobs();
            }
        });

        this.addJob(job);
    }

    public persistJobs(force: boolean = false): void {
        if (force) {
            this._persistJobs();
            return;
        }
        this._persistJobsThrottle();
    }

    public loadJobsFromStorage(
        clientOptions: Pick<ClientOptions, "accessKey" | "secretKey" | "ucUrl" | "regions">,
        uploadOptions: Pick<UploadOptions, "userNatureLanguage">,
    ): void {
        if (!this.config.persistPath) {
            return;
        }
        const persistedJobs: Record<string, UploadJob["persistInfo"]> =
            JSON.parse(fs.readFileSync(this.config.persistPath, "utf-8"));
        Object.entries(persistedJobs)
            .forEach(([jobId, persistedJob]) => {
                if (this.jobs.get(jobId)) {
                    return;
                }

                if (!persistedJob.from) {
                    this.config.onError?.(new Error("load jobs from storage error: lost job.from"));
                    return;
                }

                if (!fs.existsSync(persistedJob.from.path)) {
                    this.config.onError?.(new Error(`load jobs from storage error: local file not found\nfile path: ${persistedJob.from.path}`));
                    return;
                }

                // TODO: Is the `if` useless? Why `size` or `mtime` doesn't exist?
                if (!persistedJob.from?.size || !persistedJob.from?.mtime) {
                    persistedJob.prog.loaded = 0;
                    persistedJob.uploadedParts = [];
                }

                const fileStat = fs.statSync(persistedJob.from.path);
                if (
                    fileStat.size !== persistedJob.from.size ||
                    Math.floor(fileStat.mtimeMs) !== persistedJob.from.mtime
                ) {
                    persistedJob.from.size = fileStat.size;
                    persistedJob.from.mtime = Math.floor(fileStat.mtimeMs);
                    persistedJob.prog.loaded = 0;
                    persistedJob.prog.total = fileStat.size;
                    persistedJob.uploadedParts = [];
                }

                // resumable
                persistedJob.prog.resumable = this.config.resumable && persistedJob.from.size > this.config.multipartThreshold;

                const job = UploadJob.fromPersistInfo(
                    jobId,
                    persistedJob,
                    {
                        ...clientOptions,
                        backendMode: persistedJob.backendMode,
                    },
                    {
                        uploadSpeedLimit: this.config.speedLimit,
                        isDebug: this.config.isDebug,
                        userNatureLanguage: uploadOptions.userNatureLanguage,
                    },
                );

                if ([Status.Waiting, Status.Running].includes(job.status)) {
                    job.stop();
                }

                this.addJob(job);
            });
    }

    private _persistJobsThrottle = lodash.throttle(this._persistJobs, 1000);

    private afterCreateDirectory({
        bucket,
        key,
    }: {
        bucket: string,
        key: string,
    }) {
        this.config.onCreatedDirectory?.(bucket, key);
    }
}
