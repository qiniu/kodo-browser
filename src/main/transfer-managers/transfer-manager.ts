import fs from "fs";

import TransferJob from "@common/models/job/transfer-job";
import {isLocalPath} from "@common/models/job/types";

import ByteSize from "@common/const/byte-size";
import {Status} from "@common/models/job/types";
import {ClientOptions} from "@common/qiniu";

interface OptionalConfig<Job extends TransferJob> {
    // transfer options
    resumable: boolean,
    maxConcurrency: number,
    multipartSize: number, // Bytes
    multipartThreshold: number, // Bytes
    speedLimit: number, // Bytes
    isDebug: boolean,
    persistPath: string,

    // hooks
    onError?: (err: Error) => void,
    onJobDone?: (id: string, job?: Job) => void,
}

const defaultTransferManagerConfig: OptionalConfig<TransferJob> = {
    resumable: false,
    maxConcurrency: 10,
    multipartThreshold: 10 * ByteSize.MB,
    multipartSize: 4 * ByteSize.MB,
    speedLimit: 0, // unlimited
    isDebug: false,
    persistPath: "",
}

export type TransferManagerConfig<Job extends TransferJob, Opt = {}> = Partial<OptionalConfig<Job>> & Opt

export default abstract class TransferManager<Job extends TransferJob, Opt = {}> {
    abstract persistJobs(force: boolean): void
    abstract loadJobsFromStorage(clientOptions: ClientOptions, options: any): void

    private running: number = 0
    protected jobs: Map<string, Job> = new Map<string, Job>()
    protected jobIds: string[] = []
    protected config: OptionalConfig<Job> & Opt

    protected constructor(config: TransferManagerConfig<Job, Opt>) {
        this.config = {
            ...defaultTransferManagerConfig,
            ...config,
        };
    }

    get jobsLength() {
        return this.jobs.size;
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
        this.jobIds.forEach(id => {
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
            failed,
            finished,
            stopped,
            running: this.running,
            total: this.jobsLength,
        }
    }

    updateConfig(config: Partial<TransferManagerConfig<Job, Opt>>) {
        this.config = {
            ...this.config,
            ...config,
        };
    }

    getJobsUiDataByPage(
        pageNum: number = 0,
        count: number = 10,
        query?: {
            status?: Status,
            name?: string, // TODO: Compatible with upload and download
        },
    ) {
        let list: (Job["uiData"] | undefined)[];
        if (query) {
            list = this.jobIds.map(id => this.jobs.get(id)?.uiData)
                .filter(job => {
                    if (!job) {
                        return false;
                    }

                    // status
                    const matchStatus: boolean = query.status
                        ? job.status === query.status
                        : true;

                    // name
                    let matchName: boolean = true;
                    if (query.name) {
                        if (isLocalPath(job.from)) {
                            matchName = job.from.name.includes(query.name);
                        } else {
                            matchName = job.from.key.includes(query.name);
                        }
                    }

                    // result
                    return matchStatus && matchName;
                })
                .slice(pageNum * count, pageNum * count + count);
        } else {
            list = this.jobIds.slice(pageNum * count, pageNum * count + count)
                .map(id => this.jobs.get(id)?.uiData);
        }
        return {
            list,
            ...this.jobsSummary,
        };
    }

    waitJob(jobId: string): void {
        this.jobs.get(jobId)?.wait();
        this.running -= 1;
        this.scheduleJobs();
    }

    startJob(jobId: string, options?: any): void {
        this.jobs.get(jobId)?.start(options)
            .finally(() => {
                this.afterJobDone(jobId);
            });

        this.running += 1;
    }

    stopJob(jobId: string): void {
        this.jobs.get(jobId)?.stop();
        this.running -= 1;
        this.scheduleJobs();
    }

    removeJob(jobId: string): void {
        const indexToRemove = this.jobIds.indexOf(jobId);
        if (indexToRemove < 0) {
            return;
        }
        this.jobs.get(jobId)
            ?.stop();
        this.jobIds.splice(indexToRemove, 1);
        this.jobs.delete(jobId);
        this.running -= 1;
        this.scheduleJobs();
    }

    cleanupJobs(): void {
        const idsToRemove = this.jobIds.filter(id => this.jobs.get(id)?.status === Status.Finished);
        this.jobIds = this.jobIds.filter(id => !idsToRemove.includes(id));
        idsToRemove.forEach(id => {
            this.jobs.delete(id);
        });
    }


    startAllJobs(): void {
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

    stopAllJobs({
        matchStatus,
    }: {
        matchStatus: Status[],
    } = {
        matchStatus: [Status.Running, Status.Waiting],
    }): void {
        this.jobIds
            .map(id => this.jobs.get(id))
            .forEach(job => {
                if (!job || !matchStatus.includes(job.status)){
                    return;
                }
                job.stop();
                if (job.status === Status.Running) {
                    this.running -= 1;
                }
            });
    }

    removeAllJobs(): void {
        this.stopAllJobs();
        this.jobIds = [];
        this.jobs.clear();
    }

    protected _persistJobs(): void {
        if (!this.config.persistPath) {
            return;
        }
        const persistData: Record<string, Job["persistInfo"]> = {};
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

    protected addJob(job: Job) {
        this.jobs.set(job.id, job);
        this.jobIds.push(job.id);
    }

    protected scheduleJobs(): void {
        if (this.config.isDebug) {
            console.log(`[JOB] max: ${this.config.maxConcurrency}, cur: ${this.running}, jobs: ${this.jobIds.length}`);
        }

        this.running = Math.max(0, this.running);
        if (this.running >= this.config.maxConcurrency) {
            return;
        }

        for (let i = 0; i < this.jobIds.length; i++) {
            const job = this.jobs.get(this.jobIds[i]);
            if (job?.status !== Status.Waiting) {
                continue;
            }
            this.running += 1;
            job.start()
                .finally(() => {
                    this.afterJobDone(job.id);
                });

            if (this.running >= this.config.maxConcurrency) {
                return;
            }
        }
    }

    private afterJobDone(id: string): void {
        this.running -= 1;
        this.running = Math.max(0, this.running);
        this.scheduleJobs();
        this.config.onJobDone?.(id, this.jobs.get(id));
    }
}
