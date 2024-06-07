import path from "path";
import {promises as fsPromises, constants as fsConstants} from "fs";

import sanitizeFilename from "sanitize-filename";
import {Adapter, ListedObjects} from "kodo-s3-adapter-sdk/dist/adapter";

import {ClientOptions, createQiniuClient} from "@common/qiniu";
import DownloadJob from "@common/models/job/download-job";
import {DownloadOptions, RemoteObject} from "@common/ipc-actions/download";

import TransferManager, {TransferManagerConfig} from "./transfer-manager";

interface Config {
    isOverwrite: boolean;
}

export type DownloadManagerConfig = TransferManagerConfig<DownloadJob, Config>;

export default class DownloadManager extends TransferManager<DownloadJob, Config> {
    constructor(config: DownloadManagerConfig) {
        super(config);
    }

    async createDownloadJobs(
        remoteObjects: RemoteObject[], // remote object info, including key, size, mtime
        destPath: string, // local path
        clientOptions: ClientOptions,
        downloadOptions: DownloadOptions,
        hooks?: {
            jobsAdding?: () => void,
            jobsAdded?: () => void,
        },
    ) {
        const abortSignal = this.addingAbortController.signal;
        const qiniuClient = createQiniuClient(
            clientOptions,
            {
                userNatureLanguage: downloadOptions.userNatureLanguage,
                isDebug: this.config.isDebug,
            },
        );
        qiniuClient.storageClasses = downloadOptions.storageClasses;

        // iterate selected objects
        for (let remoteObject of remoteObjects) {
            if (abortSignal.aborted) {
                return;
            }
            // get remoteBaseDirectory
            const remoteBaseDirectory = path.posix.dirname(remoteObject.key)

            // walk remote
            await this.walkRemoteObject(
                qiniuClient,
                downloadOptions,
                remoteObject,
                async (err: Error | null, walkingPath: string, walkingObject: RemoteObject): Promise<void | boolean> => {
                    if (err) {
                        this.config.onError?.(err);
                        return false;
                    }

                    if (abortSignal.aborted) {
                        return false;
                    }

                    let relativePath = path.posix.relative(remoteBaseDirectory, walkingPath);
                    // sanitizeFilename
                    relativePath = relativePath
                        .split(path.posix.sep)
                        .map(n => sanitizeFilename(n))
                        .join(path.sep);
                    const localPath = path.join(destPath, relativePath);

                    if (walkingObject.isDirectory) {
                        await this.createDirectory(localPath);
                    } else if (walkingObject.isFile) {
                        const from = {
                            bucket: walkingObject.bucket,
                            key: walkingPath,
                            size: walkingObject.size,
                            mtime: walkingObject.mtime,
                        };
                        const to = {
                            name: walkingObject.name,
                            path: localPath,
                        };
                        await this.createDownloadJob(from, to, clientOptions, downloadOptions);

                        // post add job
                        hooks?.jobsAdding?.();
                        this.scheduleJobs();
                    }
                }
            );
        }
        hooks?.jobsAdded?.();
    }

    async loadJobsFromStorage(
        clientOptions: Pick<
            ClientOptions,
            "accessKey" | "secretKey" | "sessionToken" | "bucketNameId" | "ucUrl" | "regions"
        >,
        downloadOptions: Pick<DownloadOptions, "userNatureLanguage">,
    ): Promise<void> {
        const persistStore = await this.getPersistStore();
        if (!persistStore) {
            return;
        }
        for await (const [jobId, persistedJob] of persistStore.iter()) {
            if (!persistedJob || this.jobs.get(jobId)) {
                return;
            }

            await this.loadJob(
                jobId,
                persistedJob,
                clientOptions,
                downloadOptions,
            );
        }
    }

    private async loadJob(
        jobId: string,
        persistedJob: DownloadJob["persistInfo"],
        clientOptions: Pick<
            ClientOptions,
            "accessKey" | "secretKey" | "sessionToken" | "bucketNameId" | "ucUrl" | "regions"
        >,
        downloadOptions: Pick<DownloadOptions, "userNatureLanguage">,
    ): Promise<void> {
        if (this.jobs.get(jobId)) {
            return;
        }

        const job = DownloadJob.fromPersistInfo(
            jobId,
            persistedJob,
            {
                ...clientOptions,
                backendMode: persistedJob.backendMode,
            },
            {
                downloadSpeedLimit: this.config.speedLimit,
                overwrite: this.config.isOverwrite,
                isDebug: this.config.isDebug,
                userNatureLanguage: downloadOptions.userNatureLanguage,
            },
            {
                onStatusChange: (status, prev) => {
                    this.handleJobStatusChange(job.id, status, prev);
                },
                onProgress: () => {
                    this.persistJob(job.id, job.persistInfo);
                },
            },
        );

        this._addJob(job);
    }

    removeJob(jobId: string) {
        this.jobs.get(jobId)
            ?.stop()
            ?.tryCleanupDownloadFile();
        super.removeJob(jobId);
    }

    async removeAllJobs() {
        this.stopAllJobs();
        this.jobs.forEach(job => {
            job.tryCleanupDownloadFile();
        })
        await super.removeAllJobs();
    }

    private async walkRemoteObject(
        client: Adapter,
        downloadOptions: DownloadOptions,
        remoteObject: RemoteObject,
        callback: (err: Error | null, path: string, info: RemoteObject) => Promise<boolean | void>
    ): Promise<void> {
        if (remoteObject.isFile) {
            await callback(null, remoteObject.key, remoteObject);
            return;
        }

        let nextContinuationToken: string | undefined = undefined;
        let shouldContinueWalk: boolean = true;
        // iterate fetch list
        do {
            // fetch list by next mark
            const listedObjects: ListedObjects = await client.enter("listFiles", async client => {
                return await client.listObjects(
                    downloadOptions.region,
                    downloadOptions.bucket,
                    remoteObject.key,
                    {
                        delimiter: "/",
                        minKeys: 0,
                        maxKeys: 1000,
                        nextContinuationToken,
                    },
                );
            });

            // iterate objects(include current remoteObject) and callback
            for (const obj of listedObjects.objects) {
                const isDir = obj.key.endsWith("/");
                let name = isDir ? obj.key.slice(0, -1): obj.key;
                name = obj.key.slice(name.lastIndexOf("/") + 1);
                shouldContinueWalk = await callback(null, obj.key, {
                    region: downloadOptions.region,
                    bucket: obj.bucket,
                    key: obj.key,
                    name: name,
                    mtime: obj.lastModified.getTime(),
                    size: obj.size,
                    isDirectory: isDir,
                    isFile: !isDir,
                }) ?? shouldContinueWalk;
                if (!shouldContinueWalk) {
                    break;
                }
            }

            if (!shouldContinueWalk) {
                break;
            }

            // iterate subdirectories and recursive call
            for (const dir of listedObjects.commonPrefixes ?? [] ){
                let name = dir.key.slice(0, -1);
                name = dir.key.slice(name.lastIndexOf("/") + 1);
                await this.walkRemoteObject(
                    client,
                    downloadOptions,
                    {
                        region: downloadOptions.region,
                        bucket: dir.bucket,
                        key: dir.key,
                        name: name,
                        mtime: 0,
                        size: 0,
                        isDirectory: true,
                        isFile: false,
                    },
                    callback,
                );
            }

            nextContinuationToken = listedObjects.nextContinuationToken;
        } while (nextContinuationToken);
    }

    private async createDirectory(path: string): Promise<void> {
        try {
            const isDirectoryExists: boolean = await fsPromises.access(
                path,
                fsConstants.F_OK,
            )
                .then(() => true)
                .catch(() => false);
            if (isDirectoryExists) {
                return;
            }
            await fsPromises.mkdir(path);
        } catch (err: any) {
            this.config.onError?.(err);
        }
    }

    private async createDownloadJob(
        from: Required<DownloadJob["options"]["from"]>,
        to: DownloadJob["options"]["to"],
        clientOptions: ClientOptions,
        downloadOptions: DownloadOptions,
    ): Promise<void> {
        const job = new DownloadJob({
            from: from,
            to: to,
            prog: {
                loaded: 0,
                total: from.size,
                resumable: this.config.resumable && from.size > this.config.multipartThreshold,
            },

            clientOptions: clientOptions,
            storageClasses: downloadOptions.storageClasses,

            overwrite: downloadOptions.isOverwrite,
            region: downloadOptions.region,
            domain: downloadOptions.domain,

            multipartDownloadThreshold: this.config.multipartThreshold,
            multipartDownloadSize: this.config.multipartSize,
            downloadSpeedLimit: this.config.speedLimit,
            isDebug: this.config.isDebug,

            userNatureLanguage: downloadOptions.userNatureLanguage,

            onStatusChange: (status, prev) => {
                this.handleJobStatusChange(job.id, status, prev);
            },
            onPartCompleted: () => {
                this.persistJob(job.id, job.persistInfo);
            }
        });

        this.addJob(job);
    }
}
