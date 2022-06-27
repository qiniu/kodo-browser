import path from "path";
import fs, {Stats} from "fs";
import lodash from "lodash";
// @ts-ignore
import Walk from "@root/walk";
import {Adapter} from "kodo-s3-adapter-sdk/dist/adapter";

import ByteSize from "@common/const/byte-size";
import {ClientOptions, DestInfo, UploadOptions} from "@common/ipc-actions/upload";
import UploadJob from "@common/models/job/upload-job";
import {Status} from "@common/models/job/types";

import createQiniuClient from "../util/createClient";
import {MAX_MULTIPART_COUNT, MIN_MULTIPART_SIZE} from "./boundary-const";

// for walk
interface StatsWithName extends Stats {
    name: string,
}

// Manager
interface ManagerConfig {
    resumeUpload: boolean,
    maxConcurrency: number,
    multipartUploadSize: number, // Bytes
    multipartUploadThreshold: number, // Bytes
    uploadSpeedLimit: number, // Bytes/s
    isDebug: boolean,
    isSkipEmptyDirectory: boolean
    persistPath: string,

    onError?: (err: Error) => void,
    onJobDone?: (id: string, job?: UploadJob) => void,
    onCreatedDirectory?: (bucket: string, directoryKey: string) => void,
}

const defaultManagerConfig: ManagerConfig = {
    resumeUpload: false,
    maxConcurrency: 10,
    multipartUploadSize: 4 * ByteSize.MB, // 4MB
    multipartUploadThreshold: 10 * ByteSize.MB, // 10MB
    uploadSpeedLimit: 0,
    isDebug: false,
    isSkipEmptyDirectory: false,
    persistPath: "",
}

export default class UploadManager {
    private concurrency: number = 0;
    private jobs: Map<UploadJob["id"], UploadJob> = new Map<UploadJob["id"], UploadJob>()
    private jobIds: UploadJob["id"][] = []
    private config: Readonly<ManagerConfig>

    constructor(config: Partial<ManagerConfig>) {
        this.config = {
            ...defaultManagerConfig,
            ...config,
        };
    }

    get jobsLength() {
        return this.jobIds.length;
    }

    get jobsSummary(): {
        total: number,
        finished: number,
        running: number,
        failed: number,
        stopped: number,
    } {
        let finished = 0;
        let failed = 0;
        let stopped = 0;
        this.jobIds.forEach((id) => {
            switch (this.jobs.get(id)?.status) {
                case Status.Finished: {
                    finished += 1;
                    break;
                }
                case Status.Failed: {
                    failed += 1;
                    break;
                }
                case Status.Stopped: {
                    stopped += 1;
                    break;
                }
            }
        });
        return {
            total: this.jobIds.length,
            finished: finished,
            running: this.concurrency,
            failed: failed,
            stopped: stopped,
        }
    }

    updateConfig(config: Partial<ManagerConfig>) {
        this.config = {
            ...this.config,
            ...config,
        };
    }

    async createUploadJobs(
        filePathnameList: string[], // local file path, required absolute path
        destInfo: DestInfo,
        uploadOptions: UploadOptions,
        clientOptions: ClientOptions,
        hooks?: {
            jobsAdding?: () => void,
            jobsAdded?: () => void,
        },
    ) {
        const qiniu = createQiniuClient(
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
                        return
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
                            qiniu,
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
                                qiniu,
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
                        this.createUploadJob(from, to, uploadOptions, clientOptions, destInfo.regionId);

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
        uploadOptions: UploadOptions,
        clientOptions: ClientOptions,
        regionId: string,
    ): void {
        // parts count
        const partsCount = Math.ceil(from.size / this.config.multipartUploadSize);

        // part size
        let partSize = this.config.multipartUploadSize;
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
                resumable: this.config.resumeUpload && from.size > this.config.multipartUploadThreshold,
            },

            clientOptions: {
                accessKey: clientOptions.accessKey,
                secretKey: clientOptions.secretKey,
                ucUrl: clientOptions.ucUrl,
                regions: clientOptions.regions,
                backendMode: clientOptions.backendMode,
            },
            storageClasses: uploadOptions.storageClasses,

            overwrite: uploadOptions.isOverwrite,
            region: regionId,
            storageClassName: uploadOptions.storageClassName,

            multipartUploadThreshold: this.config.multipartUploadThreshold,
            multipartUploadSize: partSize,
            uploadSpeedLimit: this.config.uploadSpeedLimit,
            isDebug: this.config.isDebug,

            userNatureLanguage: uploadOptions.userNatureLanguage,
        });

        this.addJob(job);
    }

    private addJob(job: UploadJob) {
        job.on("partcomplete", () => {
            this.persistJobs();
            return false;
        });
        job.on("complete", () => {
            this.persistJobs();
            return false;
        });

        this.jobs.set(job.id, job);
        this.jobIds.push(job.id);
    }

    public getJobsUiDataByPage(pageNum: number = 0, count: number = 10, query?: { status?: Status, name?: string }) {
        let list: (UploadJob["uiData"] | undefined)[];
        if (query) {
            list = this.jobIds.map(id => this.jobs.get(id)?.uiData)
                .filter(job => {
                    const matchStatus = query.status
                        ? job?.status === query.status
                        : true;
                    const matchName = query.name
                        ? job?.from.name.includes(query.name)
                        : true;
                    return matchStatus && matchName;
                })
                .slice(pageNum, pageNum * count + count);
        } else {
            list = this.jobIds.slice(pageNum, pageNum * count + count)
                .map(id => this.jobs.get(id)?.uiData);
        }
        return {
            list,
            ...this.jobsSummary,
        };
    }

    public getJobsUiDataByIds(ids: UploadJob["id"][]) {
        return {
            list: ids.filter(id => this.jobs.has(id))
                .map(id => this.jobs.get(id)?.uiData),
            ...this.jobsSummary,
        };
    }

    public persistJobs(force: boolean = false): void {
        if (force) {
            this._persistJobs();
            return;
        }
        this._persistJobsThrottle();
    }

    private _persistJobsThrottle = lodash.throttle(this._persistJobs, 1000);

    private _persistJobs(): void {
        if (!this.config.persistPath) {
            return;
        }
        const persistData: Record<string, UploadJob["persistInfo"]> = {};
        this.jobIds.forEach(id => {
            const job = this.jobs.get(id);
            if (!job || job.status === Status.Finished) {
                return;
            }
            persistData[id] = job.persistInfo;
        });
        fs.writeFileSync(
            this.config.persistPath,
            JSON.stringify(persistData),
        );
    }

    public loadJobsFromStorage(
        clientOptions: Pick<ClientOptions, "accessKey" | "secretKey" | "ucUrl" | "regions">,
        uploadOptions: Pick<UploadOptions, "userNatureLanguage">
    ): void {
        if (!this.config.persistPath) {
            return;
        }
        const persistedJobs: Record<string, UploadJob["persistInfo"]> = JSON.parse(fs.readFileSync(this.config.persistPath, "utf-8"));
        Object.entries(persistedJobs)
            .forEach(([jobId, persistedJob]) => {
                if (this.jobs.get(jobId)) {
                    return
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
                persistedJob.prog.resumable = this.config.resumeUpload && persistedJob.from.size > this.config.multipartUploadThreshold;

                const job = UploadJob.fromPersistInfo(
                    jobId,
                    persistedJob,
                    {
                        ...clientOptions,
                        backendMode: persistedJob.backendMode,
                    },
                    {
                        uploadSpeedLimit: this.config.uploadSpeedLimit,
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

    public waitJob(jobId: string): void {
        this.jobs.get(jobId)?.wait();
        this.scheduleJobs();
    }

    public startJob(jobId: string, forceOverwrite: boolean = false): void {
        this.jobs.get(jobId)?.start(forceOverwrite);
    }

    public stopJob(jobId: string): void {
        this.jobs.get(jobId)?.stop();
    }

    public removeJob(jobId: string): void {
        const indexToRemove = this.jobIds.indexOf(jobId);
        if (indexToRemove < 0) {
            return;
        }
        this.jobs.get(jobId)?.stop();
        this.jobIds.splice(indexToRemove, 1);
        this.jobs.delete(jobId);
    }

    public cleanupJobs(): void {
        const idsToRemove = this.jobIds.filter(id => this.jobs.get(id)?.status === Status.Finished);
        this.jobIds = this.jobIds.filter(id => !idsToRemove.includes(id));
        idsToRemove.forEach(id => {
            this.jobs.delete(id);
        });
    }

    public startAllJobs(): void {
        this.jobIds
            .map(id => this.jobs.get(id))
            .forEach(job => {
                if (!job) {
                    return;
                }
                if ([
                    Status.Stopped,
                    Status.Failed,
                ].includes(job.status)) {
                    job.wait();
                }
            });
        this.scheduleJobs();
    }

    public stopAllJobs({
        matchStatus,
    }: {
        matchStatus: Status[],
    } = {
        matchStatus: [],
    }): void {
        this.jobIds
            .map(id => this.jobs.get(id))
            .forEach(job => {
                if (!job || ![Status.Running, Status.Waiting].includes(job.status)) {
                    return;
                }
                if (!matchStatus.includes(job.status)){
                    return;
                }
                job.stop();
            });
    }

    public removeAllJobs(): void {
        this.stopAllJobs();
        this.jobIds = [];
        this.jobs.clear();
    }

    private scheduleJobs(): void {
        if (this.config.isDebug) {
            console.log(`[JOB] upload max: ${this.config.maxConcurrency}, cur: ${this.concurrency}, jobs: ${this.jobIds.length}`);
        }

        this.concurrency = Math.max(0, this.concurrency);
        if (this.concurrency >= this.config.maxConcurrency) {
            return;
        }

        for (let i = 0; i < this.jobIds.length; i++) {
            const job = this.jobs.get(this.jobIds[i]);
            if (job?.status !== Status.Waiting) {
                continue;
            }
            this.concurrency += 1;
            job.start()
                .finally(() => {
                    this.afterJobDone(job.id);
                });

            this.concurrency = Math.max(0, this.concurrency);
            if (this.concurrency >= this.config.maxConcurrency) {
                return;
            }
        }
    }

    private afterJobDone(id: UploadJob["id"]): void {
        this.concurrency -= 1;
        this.scheduleJobs();
        this.config.onJobDone?.(id, this.jobs.get(id));
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
