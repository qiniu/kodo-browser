import ByteSize from "@common/const/byte-size";
import {ClientOptions} from "@common/qiniu";

import TransferJob from "@common/models/job/transfer-job";
import {isLocalPath, Status} from "@common/models/job/types";

import {DataStore, getDataStoreOrCreate} from "@main/kv-store";

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
    abstract loadJobsFromStorage(clientOptions: ClientOptions, options: any): void

    private jobsStatusSummary: Record<Status, number> = Object.values(Status)
        .reduce((r, v) => {
            r[v] = 0;
            return r;
        }, {} as Record<Status, number>)

    protected persistStore: DataStore<Job["persistInfo"]> | Promise<DataStore<Job["persistInfo"]>>
    protected jobs: Map<string, Job> = new Map<string, Job>()
    protected jobIds: string[] = []
    protected config: OptionalConfig<Job> & Opt

    private offlineJobIds: string[] = []

    protected constructor(config: TransferManagerConfig<Job, Opt>) {
        this.config = {
            ...defaultTransferManagerConfig,
            ...config,
        };
        this.persistStore = getDataStoreOrCreate<Job["persistInfo"]>({
          workingDirectory: this.config.persistPath,
        });
    }

    get running() {
        return this.jobsStatusSummary[Status.Running];
    }

    get jobsLength() {
        return Object.values(this.jobsStatusSummary)
            .reduce((r, i) => r + i);
    }

    get jobsSummary(): {
        total: number,
        finished: number,
        running: number,
        failed: number,
        stopped: number,
    } {
        return {
            failed: this.jobsStatusSummary[Status.Failed],
            finished: this.jobsStatusSummary[Status.Finished],
            stopped: this.jobsStatusSummary[Status.Stopped],
            running: this.jobsStatusSummary[Status.Running],
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
            name?: string,
        },
    ) {
        let list: (Job["uiData"] | undefined)[];
        if (query) {
            list = this.jobIds
                .map(id => this.jobs.get(id)?.uiData)
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
                });
        } else {
            list = this.jobIds
              .map(id => this.jobs.get(id)?.uiData);
        }
        return {
            list: list.slice(pageNum * count, pageNum * count + count),
            hasMore: (pageNum * count + count) < list.length,
            ...this.jobsSummary,
        };
    }

    waitJob(jobId: string, options?: any): void {
        const job = this.jobs.get(jobId);
        if (!job){
            return;
        }
        job.wait(options);
        this.scheduleJobs();
    }

    startJob(jobId: string, options?: any): void {
        const job = this.jobs.get(jobId);
        if (!job) {
          return;
        }
        job.start(options)
            .finally(() => {
                this.afterJobDone(jobId);
            });
    }

    stopJob(jobId: string): void {
        const job = this.jobs.get(jobId);
        if (!job) {
            return;
        }
        job.stop();
        this.scheduleJobs();
    }

    removeJob(jobId: string): void {
        const indexToRemove = this.jobIds.indexOf(jobId);
        if (indexToRemove < 0) {
            return;
        }
        this.jobIds.splice(indexToRemove, 1);

        const job = this.jobs.get(jobId);
        if (!job) {
          return;
        }
        job.stop();

        this.jobs.delete(jobId);
        this.persistJob(jobId, null)
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
            });
    }

    async removeAllJobs() {
        this.stopAllJobs();
        this.jobIds = [];
        this.jobs.clear();
        this.persistStore = await this.persistStore
        await this.persistStore.clear()
    }

    stopJobsByOffline(): void {
        for (const [jobId, job] of this.jobs) {
            if ([Status.Running, Status.Waiting].includes(job.status)) {
                job.stop();
                this.offlineJobIds.push(jobId);
            }
        }
    }

    startJobsByOnline(): void {
        for (const jobId of this.offlineJobIds) {
            const job = this.jobs.get(jobId);
            if (job && job.status === Status.Stopped) {
                job.wait();
            }
        }
        this.offlineJobIds = [];
        this.scheduleJobs();
    }

    protected _addJob(job: Job): void {
        this.jobs.set(job.id, job);
        this.jobIds.push(job.id);
    }

    protected async addJob(job: Job): Promise<void> {
        this._addJob(job)
        this.persistStore = await this.persistStore;
        await this.persistStore.set(job.id, job.persistInfo);
    }

    protected scheduleJobs(): void {
        if (this.config.isDebug) {
            console.log(`[JOB] max: ${this.config.maxConcurrency}, cur: ${this.running}, jobs: ${this.jobIds.length}`);
        }

        this.jobsStatusSummary[Status.Running] = Math.max(0, this.running);
        if (this.running >= this.config.maxConcurrency) {
            return;
        }

        for (let i = 0; i < this.jobIds.length; i++) {
            const job = this.jobs.get(this.jobIds[i]);
            if (job?.status !== Status.Waiting) {
                continue;
            }
            job.start()
                .finally(() => {
                    this.afterJobDone(job.id);
                });

            if (this.running >= this.config.maxConcurrency) {
                return;
            }
        }
    }

    protected async persistJob<T>(jobId: string, persistInfo: T | null) {
        this.persistStore = await this.persistStore;
        if (persistInfo) {
          await this.persistStore.set(jobId, persistInfo);
        } else {
          await this.persistStore.del(jobId);
        }
    }

    protected handleJobStatusChange(curr: Status, prev: Status) {
      if (prev === curr) {
        return;
      }

      this.jobsStatusSummary[prev] -= 1;
      this.jobsStatusSummary[curr] += 1;
    }

    private afterJobDone(id: string): void {
        if (this.offlineJobIds.some(offlineId => offlineId === id)) {
            return;
        }
        this.scheduleJobs();
        const job = this.jobs.get(id);
        if (!job || job?.status === Status.Finished) {
            this.persistJob(id, null)
        } else {
            this.persistJob(job.id, job.persistInfo)
        }
        this.config.onJobDone?.(id, job);
    }
}
