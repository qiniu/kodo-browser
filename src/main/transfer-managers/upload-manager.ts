import path from "path";
import {Stats, promises as fsPromises} from "fs";

// @ts-ignore
import Walk from "@root/walk";
import {Adapter} from "kodo-s3-adapter-sdk/dist/adapter";

import {ClientOptions, createQiniuClient} from "@common/qiniu";
import {DestInfo, UploadOptions} from "@common/ipc-actions/upload";
import UploadJob from "@common/models/job/upload-job";

import {MAX_MULTIPART_COUNT, MIN_MULTIPART_SIZE} from "./boundary-const";
import TransferManager, {TransferManagerConfig} from "./transfer-manager";
import singleFlight from "./single-flight";

// for walk
interface StatsWithName extends Stats {
    name: string,
}

interface Config {
    multipartConcurrency: number,
    isSkipEmptyDirectory: boolean,

    onCreatedDirectory?: (bucket: string, directoryKey: string) => void,
}

export type UploadManagerConfig = TransferManagerConfig<UploadJob, Config>;

export default class UploadManager extends TransferManager<UploadJob, Config> {
    constructor(config: UploadManagerConfig) {
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

                    let relativePathname = path.relative(localBaseDirectory, walkingPathname);
                    // for windows path
                    if (path.sep !== path.posix.sep) {
                        relativePathname = relativePathname.replaceAll(path.sep, path.posix.sep);
                    }
                    let remoteKey: string
                    if (!remoteBaseDirectory || remoteBaseDirectory.endsWith(path.posix.sep)) {
                      remoteKey = remoteBaseDirectory + relativePathname;
                    } else {
                      remoteKey = [
                        remoteBaseDirectory,
                        relativePathname,
                      ].join(path.posix.sep);
                    }

                    if (statsWithName.isDirectory()) {
                        const remoteDirectoryKey = remoteKey + path.posix.sep;
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
                            mtime: Math.floor(statsWithName.mtimeMs),
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
     * best to call {@link createDirectoryWithSingleFlight}
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

        // part concurrency
        const partConcurrency = this.config.multipartConcurrency;

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
            multipartUploadConcurrency: partConcurrency,
            uploadSpeedLimit: this.config.speedLimit,
            isDebug: this.config.isDebug,

            userNatureLanguage: uploadOptions.userNatureLanguage,

            onStatusChange: (status, prev) => {
                this.handleJobStatusChange(job.id, status, prev);
            },
            onPartCompleted: () => {
                this.persistJob(job.id, job.persistInfo);
            },
        });

        this.addJob(job);
    }

    async loadJobsFromStorage(
        clientOptions: Pick<ClientOptions, "accessKey" | "secretKey" | "ucUrl" | "regions">,
        uploadOptions: Pick<UploadOptions, "userNatureLanguage">,
    ): Promise<void> {
        const persistStore = await this.getPersistStore();
        if (!persistStore) {
            return;
        }
        for await (const [jobId, persistedJob] of persistStore.iter()) {
            if (!persistedJob || this.jobs.has(jobId)) {
                return;
            }

            await this.loadJob(
                jobId,
                persistedJob,
                clientOptions,
                uploadOptions,
            );
        }
    }

    private async loadJob(
        jobId: string,
        persistedJob: UploadJob["persistInfo"],
        clientOptions: Pick<ClientOptions, "accessKey" | "secretKey" | "ucUrl" | "regions">,
        uploadOptions: Pick<UploadOptions, "userNatureLanguage">,
    ): Promise<void> {
        if (!persistedJob.from) {
            this.config.onError?.(new Error("load jobs from storage error: lost job.from"));
            return;
        }

        try {
            await fsPromises.access(persistedJob.from.path)
        } catch {
            this.config.onError?.(new Error(`load jobs from storage error: local file not found\nfile path: ${persistedJob.from.path}`));
            return
        }

        // TODO: Is the `if` useless? Why `size` or `mtime` doesn't exist?
        if (!persistedJob.from?.size || !persistedJob.from?.mtime) {
            persistedJob.prog.loaded = 0;
            persistedJob.uploadedParts = [];
        }

        const fileStat = await fsPromises.stat(persistedJob.from.path);
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
                multipartConcurrency: this.config.multipartConcurrency,
                uploadSpeedLimit: this.config.speedLimit,
                isDebug: this.config.isDebug,
                userNatureLanguage: uploadOptions.userNatureLanguage,
            },
            {
                onStatusChange: (status, prev) => {
                    this.handleJobStatusChange(job.id, status, prev);
                },
                onPartCompleted: () => {
                    this.persistJob(job.id, job.persistInfo);
                },
            },
        );

        this._addJob(job);
    }

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
