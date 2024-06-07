import {NatureLanguage} from "kodo-s3-adapter-sdk/dist/uplog";
import {Domain} from "kodo-s3-adapter-sdk/dist/adapter";

import {ClientOptionsSerialized} from "@common/qiniu";
import {Status} from "@common/models/job/types";
import DownloadJob from "@common/models/job/download-job";
import StorageClass from "@common/models/storage-class";

import {Sender} from "./types";

export interface RemoteObject {
    name: string,
    region: string,
    bucket: string,
    key: string,
    size: number,
    mtime: number,
    isDirectory: boolean,
    isFile: boolean,
}

export interface DownloadOptions {
    region: string,
    bucket: string,

    domain?: Domain,

    isOverwrite: boolean,
    storageClasses: StorageClass[],
    userNatureLanguage: NatureLanguage
}

export enum DownloadAction {
    UpdateConfig = "UpdateConfig",
    LoadPersistJobs = "LoadPersistJobs",
    AddJobs = "AddJobs",
    StopJob = "StopJob",
    WaitJob = "WaitJob",
    StartJob = "StartJob",
    RemoveJob = "RemoveJob",
    CleanupJobs = "CleanupJobs",
    StartAllJobs = "StartAllJobs",
    StopAllJobs = "StopAllJobs",
    RemoveAllJobs = "RemoveAllJobs",
    StopJobsByOffline = "StopJobsByOffline",
    StartJobsByOnline = "StartJobsByOnline",

    // common
    UpdateUiData = "UpdateUiData",

    // reply only
    AddedJobs = "AddedJobs",
    JobCompleted = "JobCompleted",
}

export interface UpdateConfigMessage {
    action: DownloadAction.UpdateConfig,
    data: Partial<{
        resumable: boolean,
        maxConcurrency: number,
        multipartSize: number,
        multipartThreshold: number,
        speedLimit: number,
        isDebug: boolean,
        persistPath: string,

        isOverwrite: boolean,
    }>
}

export interface LoadPersistJobsMessage {
    action: DownloadAction.LoadPersistJobs,
    data: {
        clientOptions: Pick<
          ClientOptionsSerialized,
          "accessKey" | "secretKey" | "sessionToken" | "bucketNameId" | "ucUrl" | "regions"
        >
        downloadOptions: Pick<DownloadOptions, "userNatureLanguage">,
    }
}

export interface AddJobsMessage {
    action: DownloadAction.AddJobs,
    data: {
        remoteObjects: RemoteObject[],
        destPath: string,
        downloadOptions: DownloadOptions,
        clientOptions: ClientOptionsSerialized,
    }
}

export interface AddedJobsReplyMessage {
    action: DownloadAction.AddedJobs,
    data: {
        remoteObjects: RemoteObject[],
        destPath: string,
    },
}

export interface UpdateUiDataMessage {
    action: DownloadAction.UpdateUiData,
    data: {
        pageNum: number,
        count: number,
        query?: {
            status?: Status,
            name?: string,
        },
    },
}

export interface UpdateUiDataReplyMessage {
    action: DownloadAction.UpdateUiData,
    data: {
        list: (DownloadJob["uiData"] | undefined)[],
        total: number,
        finished: number,
        running: number,
        failed: number,
        stopped: number,
        hasMore: boolean,
    },
}

export interface StopJobMessage {
    action: DownloadAction.StopJob,
    data: {
        jobId: string,
    },
}

export interface WaitJobMessage {
    action: DownloadAction.WaitJob,
    data: {
        jobId: string,
    },
}

export interface StartJobMessage {
    action: DownloadAction.StartJob,
    data: {
        jobId: string,
        forceOverwrite?: boolean,
    },
}

export interface RemoveJobMessage {
    action: DownloadAction.RemoveJob,
    data: {
        jobId: string,
    },
}

export interface CleanupJobMessage {
    action: DownloadAction.CleanupJobs,
    data?: {},
}


export interface StartAllJobsMessage {
    action: DownloadAction.StartAllJobs,
    data?: {},
}

export interface StopAllJobsMessage {
    action: DownloadAction.StopAllJobs,
    data?: {},
}

export interface StopJobsByOfflineMessage {
    action: DownloadAction.StopJobsByOffline,
    data?: {},
}

export interface StartJobsByOnlineMessage {
    action: DownloadAction.StartJobsByOnline,
    data?: {},
}

export interface RemoveAllJobsMessage {
    action: DownloadAction.RemoveAllJobs,
    data?: {},
}

export interface JobCompletedReplyMessage {
    action: DownloadAction.JobCompleted,
    data: {
        jobsId: string,
        jobUiData: DownloadJob["uiData"],
    }
}

export type DownloadMessage = UpdateConfigMessage
    | LoadPersistJobsMessage
    | AddJobsMessage
    | UpdateUiDataMessage
    | StopJobMessage
    | WaitJobMessage
    | StartJobMessage
    | RemoveJobMessage
    | CleanupJobMessage
    | StartAllJobsMessage
    | StopAllJobsMessage
    | RemoveAllJobsMessage
    | StopJobsByOfflineMessage
    | StartJobsByOnlineMessage

export type DownloadReplyMessage = UpdateUiDataReplyMessage
    | AddedJobsReplyMessage
    | JobCompletedReplyMessage

export class DownloadActionFns {
    constructor(
        private readonly sender: Sender<DownloadMessage>,
        private readonly channel: string,
    ) {
    }

    updateConfig(data: UpdateConfigMessage["data"]) {
        this.sender.send(this.channel, {
            action: DownloadAction.UpdateConfig,
            data: data,
        });
    }

    loadPersistJobs(data: LoadPersistJobsMessage["data"]) {
        this.sender.send(this.channel, {
            action: DownloadAction.LoadPersistJobs,
            data,
        })
    }

    addJobs(data: AddJobsMessage["data"]) {
        this.sender.send(this.channel, {
            action: DownloadAction.AddJobs,
            data,
        });
    }

    updateUiData(data: UpdateUiDataMessage["data"]) {
        this.sender.send(this.channel, {
            action: DownloadAction.UpdateUiData,
            data,
        });
    }

    waitJob(data: WaitJobMessage["data"]) {
        this.sender.send(this.channel, {
            action: DownloadAction.WaitJob,
            data,
        });
    }

    startJob(data: StartJobMessage["data"]) {
        this.sender.send(this.channel, {
            action: DownloadAction.StartJob,
            data,
        });
    }

    stopJob(data: StopJobMessage["data"]) {
        this.sender.send(this.channel, {
            action: DownloadAction.StopJob,
            data,
        });
    }

    removeJob(data: RemoveJobMessage["data"]) {
        this.sender.send(this.channel, {
            action: DownloadAction.RemoveJob,
            data,
        });
    }

    cleanUpJobs() {
        this.sender.send(this.channel, {
            action: DownloadAction.CleanupJobs,
            data: {},
        });
    }

    startAllJobs() {
        this.sender.send(this.channel, {
            action: DownloadAction.StartAllJobs,
            data: {},
        });
    }

    stopAllJobs() {
        this.sender.send(this.channel, {
            action: DownloadAction.StopAllJobs,
            data: {},
        });
    }

    stopJobsByOffline() {
        this.sender.send(this.channel, {
            action: DownloadAction.StopJobsByOffline,
            data: {},
        });
    }

    startJobsByOnline() {
        this.sender.send(this.channel, {
            action: DownloadAction.StartJobsByOnline,
            data: {},
        });
    }

    removeAllJobs() {
        this.sender.send(this.channel, {
            action: DownloadAction.RemoveAllJobs,
            data: {},
        });
    }
}
