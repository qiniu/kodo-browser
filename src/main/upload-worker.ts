import {Region} from "kodo-s3-adapter-sdk";

import {
  AddedJobsReplyMessage,
  CreatedDirectoryReplyMessage,
  JobCompletedReplyMessage,
  UpdateUiDataReplyMessage,
  UploadAction,
  UploadMessage
} from "@common/ipc-actions/upload";
import {Status} from "@common/models/job/types";
import UploadJob from "@common/models/job/upload-job";

import UploadManager from "./transfer-managers/upload-manager";

// initial UploadManager Config from argv after `--config-json`
const configStr = process.argv.find((_arg, i, arr) => arr[i - 1] === "--config-json");
const uploadManagerConfig = configStr ? JSON.parse(configStr) : {};
uploadManagerConfig.onJobDone = handleJobDone;
uploadManagerConfig.onCreatedDirectory = handleCreatedDirectory;
const uploadManager = new UploadManager(uploadManagerConfig);

process.on("uncaughtException", (err) => {
    uploadManager.persistJobs(true);
    console.error("upload worker: uncaughtException", err);
});

process.on("message", (message: UploadMessage) => {
    switch (message.action) {
        case UploadAction.UpdateConfig: {
            uploadManager.updateConfig(message.data);
            break;
        }
        case UploadAction.LoadPersistJobs: {
            uploadManager.loadJobsFromStorage(
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
                        r.ucUrls =  [message.data.clientOptions.ucUrl];
                        r.s3Urls = serializedRegion.s3Urls;
                        return r;
                    }),
                },
                message.data.uploadOptions,
            );
            break;
        }
        case UploadAction.AddJobs: {
            uploadManager.createUploadJobs(
                message.data.filePathnameList,
                message.data.destInfo,
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
                message.data.uploadOptions,
                {
                    jobsAdding: () => {
                        uploadManager.persistJobs();
                    },
                    jobsAdded: () => {
                        const replyMessage: AddedJobsReplyMessage = {
                            action: UploadAction.AddedJobs,
                            data: {
                                filePathnameList: message.data.filePathnameList,
                                destInfo: message.data.destInfo,
                            },
                        };
                        process.send?.(replyMessage);
                    },
                },
            );
            break;
        }
        case UploadAction.UpdateUiData: {
            const replyMessage: UpdateUiDataReplyMessage = {
                action: UploadAction.UpdateUiData,
                data: uploadManager.getJobsUiDataByPage(
                    message.data.pageNum,
                    message.data.count,
                    message.data.query,
                ),
            }
            process.send?.(replyMessage);
            break;
        }
        case UploadAction.StopJob: {
            uploadManager.stopJob(message.data.jobId);
            break;
        }
        case UploadAction.WaitJob: {
            uploadManager.waitJob(message.data.jobId, message.data.options);
            break;
        }
        case UploadAction.StartJob: {
            uploadManager.startJob(message.data.jobId, message.data.options);
            break;
        }
        case UploadAction.RemoveJob: {
            uploadManager.removeJob(message.data.jobId);
            uploadManager.persistJobs();
            break;
        }
        case UploadAction.CleanupJobs: {
            uploadManager.cleanupJobs();
            break;
        }
        case UploadAction.StartAllJobs: {
            uploadManager.startAllJobs();
            break;
        }
        case UploadAction.StopAllJobs: {
            uploadManager.stopAllJobs();
            break;
        }
        case UploadAction.StopJobsByOffline: {
            uploadManager.stopJobsByOffline();
            break;
        }
        case UploadAction.StartJobsByOnline: {
            uploadManager.startJobsByOnline();
            break;
        }
        case UploadAction.RemoveAllJobs: {
            uploadManager.removeAllJobs();
            uploadManager.persistJobs(true);
            break;
        }
        default: {
            console.warn("Upload Manager received unknown action, message:", message);
        }
    }
});

let isCleanup = false;
function handleExit() {
    if (isCleanup) {
        return Promise.resolve();
    }

    isCleanup = true;

    uploadManager.stopAllJobs({
        matchStatus: [Status.Waiting],
    });

    return new Promise<void>((resolve, reject) => {
        try {
            // resolve inflight jobs persisted status not correct
            setTimeout(() => {
                uploadManager.stopAllJobs({
                    matchStatus: [Status.Running],
                });
                uploadManager.persistJobs(true);
                resolve();
            }, 2000);
        } catch {
            reject()
        }
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

function handleJobDone(jobId: string, job?: UploadJob) {
    if (job?.status === Status.Finished) {
        const jobCompletedReplyMessage: JobCompletedReplyMessage = {
            action: UploadAction.JobCompleted,
            data: {
                jobId,
                jobUiData: job.uiData,
            },
        };
        process.send?.(jobCompletedReplyMessage);
    }
}

function handleCreatedDirectory(bucket: string, directoryKey: string) {
    const createdDirectoryReplyMessage: CreatedDirectoryReplyMessage = {
        action: UploadAction.CreatedDirectory,
        data: {
            bucket,
            directoryKey,
        },
    };
    process.send?.(createdDirectoryReplyMessage);
    uploadManager.persistJobs();
}
