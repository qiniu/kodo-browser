import path from "path";
import fs, {Stats, promises as fsPromises} from "fs";

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
import singleFlight from "./single-flight";

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
            // remoteBaseDirectory maybe "", means upload to bucket root
            // meybe "/", means upload to "bucket//"
            const remoteBaseDirectory = destInfo.key;
            const localBaseDirectory = path.dirname(filePathname);

            await walk(
                filePathname,
                async (err: Error, walkingPathname: string, statsWithName: StatsWithName): Promise<void> => {
                    if (err) {
                        this.config.onError?.(err);
                        return;
                    }

                    let remoteKey = remoteBaseDirectory + walkingPathname.slice(localBaseDirectory.length + 1);
                    // for windows path
                    if (path.sep === "\\") {
                        remoteKey = remoteKey.replace(/\\/g, "/");
                    }

                    if (statsWithName.isDirectory()) {
                        const remoteDirectoryKey = remoteKey + "/";
                        let shouldCreateDirectory = false;
                        if (this.config.isSkipEmptyDirectory) {
                            const dir = await fsPromises.opendir(walkingPathname);
                            if (await dir.read() !== null) {
                                shouldCreateDirectory = true;
                            }
                            dir.close();
                        } else if (!directoryToCreate.get(remoteDirectoryKey)) {
                            shouldCreateDirectory = true;
                        }
                        if (shouldCreateDirectory) {
                            const flightKey = destInfo.regionId + destInfo.bucketName + remoteDirectoryKey;
                            this.createDirectoryWithSingleFlight(
                                flightKey,
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

    /**
     *  best to call {@link createDirectoryWithSingleFlight}
     */
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
            const isDirectoryExists = await client.isExists(
                options.region,
                {
                    bucket: options.bucketName,
                    key: options.key,
                },
            );
            if (isDirectoryExists) {
                return
            }
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

    private createDirectoryWithSingleFlight = singleFlight(this.createDirectory)

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

            onStatusChange: (status, prev) => {
                this.handleJobStatusChange(status, prev);
            },
            onProgress: () => {
                this.persistJobs();
            },
            onPartCompleted: () => {
                this.persistJobs();
            },
            onCompleted: () => {
                this.persistJobs();
            },
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
                    {
                        onStatusChange: (status, prev) => {
                            this.handleJobStatusChange(status, prev);
                        },
                        onProgress: () => {
                            this.persistJobs();
                        },
                        onPartCompleted: () => {
                            this.persistJobs();
                        },
                        onCompleted: () => {
                            this.persistJobs();
                        },
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
