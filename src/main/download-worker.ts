import {Region} from "kodo-s3-adapter-sdk";

import {
  AddedJobsReplyMessage,
  DownloadAction,
  DownloadMessage,
  JobCompletedReplyMessage,
  UpdateUiDataReplyMessage
} from "@common/ipc-actions/download";
import {Status} from "@common/models/job/types";
import DownloadJob from "@common/models/job/download-job";

import DownloadManager from "./transfer-managers/download-manager";

// initial DownloadManager Config from argv after `--config-json`
const configStr = process.argv.find((_arg, i, arr) => arr[i - 1] === "--config-json");
const downloadManagerConfig = configStr ? JSON.parse(configStr) : {};
downloadManagerConfig.onJobDone = handleJobDone;
const downloadManager = new DownloadManager(downloadManagerConfig);

process.on("uncaughtException", (err) => {
    console.error("download worker: uncaughtException", err);
});

process.on("message", (message: DownloadMessage) => {
    switch (message.action) {
        case DownloadAction.UpdateConfig: {
            downloadManager.updateConfig(message.data);
            break;
        }
        case DownloadAction.LoadPersistJobs: {
            downloadManager.loadJobsFromStorage(
                {
                    ...message.data.clientOptions,
                    // regions ars serialized, so need new it.
                    // reference src/renderer/config.ts load(): result
                    regions: message.data.clientOptions.regions.map(serializedRegion => {
                        const r = new Region(
                            serializedRegion.id,
                            serializedRegion.s3Id,
                            serializedRegion.label,
                        );
                        r.ucUrls = [message.data.clientOptions.ucUrl];
                        r.s3Urls = serializedRegion.s3Urls;
                        return r;
                    }),
                },
                message.data.downloadOptions,
            );
            break;
        }
        case DownloadAction.AddJobs: {
            downloadManager.createDownloadJobs(
                message.data.remoteObjects,
                message.data.destPath,
                {
                    ...message.data.clientOptions,
                    // regions ars serialized, so need new it.
                    // reference src/renderer/config.ts load(): result
                    regions: message.data.clientOptions.regions.map(serializedRegion => {
                        const r = new Region(
                            serializedRegion.id,
                            serializedRegion.s3Id,
                            serializedRegion.label,
                        );
                        r.ucUrls = [message.data.clientOptions.ucUrl];
                        r.s3Urls = serializedRegion.s3Urls;
                        return r;
                    }),
                },
                message.data.downloadOptions,
                {
                    jobsAdding: () => {
                    },
                    jobsAdded: () => {
                        const replyMessage: AddedJobsReplyMessage = {
                            action: DownloadAction.AddedJobs,
                            data: {
                                remoteObjects: message.data.remoteObjects,
                                destPath: message.data.destPath,
                            },
                        };
                        process.send?.(replyMessage);
                    },
                },
            );
            break;
        }
        case DownloadAction.UpdateUiData: {
            const replyMessage: UpdateUiDataReplyMessage = {
                action: DownloadAction.UpdateUiData,
                data: downloadManager.getJobsUiDataByPage(
                    message.data.pageNum,
                    message.data.count,
                    message.data.query,
                ),
            }
            process.send?.(replyMessage);
            break;
        }
        case DownloadAction.StopJob: {
            downloadManager.stopJob(message.data.jobId);
            break;
        }
        case DownloadAction.WaitJob: {
            downloadManager.waitJob(message.data.jobId);
            break;
        }
        case DownloadAction.StartJob: {
            downloadManager.startJob(message.data.jobId);
            break;
        }
        case DownloadAction.RemoveJob: {
            downloadManager.removeJob(message.data.jobId);
            break;
        }
        case DownloadAction.CleanupJobs: {
            downloadManager.cleanupJobs();
            break;
        }
        case DownloadAction.StartAllJobs: {
            downloadManager.startAllJobs();
            break;
        }
        case DownloadAction.StopAllJobs: {
            downloadManager.stopAllJobs();
            break;
        }
        case DownloadAction.StopJobsByOffline: {
            downloadManager.stopJobsByOffline();
            break;
        }
        case DownloadAction.StartJobsByOnline: {
            downloadManager.startJobsByOnline();
            break;
        }
        case DownloadAction.RemoveAllJobs: {
            downloadManager.removeAllJobs();
            break;
        }
        default: {
            console.warn("Download Manager received unknown action, message:", message);
        }
    }
});


let isCleanup = false;
function handleExit() {
    if (isCleanup) {
        return Promise.resolve();
    }

    isCleanup = true;
    downloadManager.stopAllJobs({
        matchStatus: [Status.Running, Status.Waiting],
    });

    return new Promise<void>(resolve => {
        const timer = setInterval(() => {
            if (!downloadManager.running) {
                clearInterval(timer);
                resolve();
            }
        }, 100);
    });
}


process.on("exit", () => {
    handleExit();
});

process.on("SIGTERM", () => {
    handleExit()
        .then(() => {
            process.exit(0);
        });
});

function handleJobDone(jobId: string, job?: DownloadJob) {
    if (!process.connected) {
        return;
    }
    if (job?.status === Status.Finished) {
        const jobCompletedReplyMessage: JobCompletedReplyMessage = {
            action: DownloadAction.JobCompleted,
            data: {
                jobsId: jobId,
                jobUiData: job.uiData,
            }
        };
        process.send?.(jobCompletedReplyMessage);
    }
}
