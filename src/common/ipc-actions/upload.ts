import {IpcRenderer} from "electron";
import {NatureLanguage} from "kodo-s3-adapter-sdk/dist/uplog";

import {ClientOptionsSerialized} from "@common/qiniu";
import StorageClass from "@common/models/storage-class";
import UploadJob from "@common/models/job/upload-job";
import {Status} from "@common/models/job/types";

// some types maybe should in models
export interface DestInfo {
    regionId: string,
    bucketName: string,
    key: string,
}

export interface UploadOptions {
    isOverwrite: boolean,
    storageClassName: StorageClass["kodoName"],
    storageClasses: StorageClass[],
    userNatureLanguage: NatureLanguage,
}

// action names
export enum UploadAction {
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

    // common
    UpdateUiData = "UpdateUiData",

    // reply only
    AddedJobs = "AddedJobs",
    JobCompleted = "JobCompleted",
    CreatedDirectory = "CreatedDirectory",
}

// actions with payload data
export interface UpdateConfigMessage {
    action: UploadAction.UpdateConfig,
    data: Partial<{
        resumable: boolean,
        maxConcurrency: number,
        multipartSize: number, // Bytes
        multipartThreshold: number, // Bytes
        speedLimit: number, // Bytes/s
        isDebug: boolean,
        isSkipEmptyDirectory: boolean,
        persistPath: string,
    }>,
}

export interface LoadPersistJobsMessage {
    action: UploadAction.LoadPersistJobs,
    data: {
        clientOptions: Pick<ClientOptionsSerialized, "accessKey" | "secretKey" | "ucUrl" | "regions">,
        uploadOptions: Pick<UploadOptions, "userNatureLanguage">,
    },
}

export interface AddJobsMessage {
    action: UploadAction.AddJobs,
    data: {
        filePathnameList: string[],
        destInfo: DestInfo,
        uploadOptions: UploadOptions,
        clientOptions: ClientOptionsSerialized,
    },
}

export interface AddedJobsReplyMessage {
    action: UploadAction.AddedJobs,
    data: {
        filePathnameList: string[],
        destInfo: DestInfo,
    },
}

export interface UpdateUiDataMessage {
    action: UploadAction.UpdateUiData,
    data: {
        pageNum: number,
        count: number,
        query?: { status?: Status, name?: string },
    },
}

export interface UpdateUiDataReplyMessage {
    action: UploadAction.UpdateUiData,
    data: {
        list: (UploadJob["uiData"] | undefined)[],
        total: number,
        finished: number,
        running: number,
        failed: number,
        stopped: number,
    },
}

export interface StopJobMessage {
    action: UploadAction.StopJob,
    data: {
        jobId: string,
    },
}

export interface WaitJobMessage {
    action: UploadAction.WaitJob,
    data: {
        jobId: string,
    },
}

export interface StartJobMessage {
    action: UploadAction.StartJob,
    data: {
        jobId: string,
        options?: {
            forceOverwrite: boolean,
        },
    },
}

export interface RemoveJobMessage {
    action: UploadAction.RemoveJob,
    data: {
        jobId: string,
    },
}

export interface CleanupJobMessage {
    action: UploadAction.CleanupJobs,
    data?: {},
}

export interface StartAllJobsMessage {
    action: UploadAction.StartAllJobs,
    data?: {},
}

export interface StopAllJobsMessage {
    action: UploadAction.StopAllJobs,
    data?: {},
}

export interface RemoveAllJobsMessage {
    action: UploadAction.RemoveAllJobs,
    data?: {},
}

export interface JobCompletedReplyMessage {
    action: UploadAction.JobCompleted,
    data: {
        jobId: string,
        jobUiData: UploadJob["uiData"],
    },
}

export interface CreatedDirectoryReplyMessage {
    action: UploadAction.CreatedDirectory,
    data: {
        bucket: string,
        directoryKey: string,
    },
}

export type UploadMessage = UpdateConfigMessage
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

export type UploadReplyMessage = UpdateUiDataReplyMessage
    | AddedJobsReplyMessage
    | JobCompletedReplyMessage
    | CreatedDirectoryReplyMessage

// send actions functions
export class UploadActionFns {
    constructor(
        private readonly ipc: IpcRenderer,
        private readonly channel: string,
    ) {
    }

    updateConfig(data: UpdateConfigMessage["data"]) {
        this.ipc.send(this.channel, {
            action: UploadAction.UpdateConfig,
            data,
        });
    }

    loadPersistJobs(data: LoadPersistJobsMessage["data"]) {
        this.ipc.send(this.channel, {
            action: UploadAction.LoadPersistJobs,
            data,
        });
    }

    addJobs(data: AddJobsMessage["data"]) {
        this.ipc.send(this.channel, {
            action: UploadAction.AddJobs,
            data,
        });
    }

    updateUiData(data: UpdateUiDataMessage["data"]) {
        this.ipc.send(this.channel, {
            action: UploadAction.UpdateUiData,
            data,
        });
    }

    waitJob(data: WaitJobMessage["data"]) {
        this.ipc.send(this.channel, {
            action: UploadAction.WaitJob,
            data,
        });
    }

    startJob(data: StartJobMessage["data"]) {
        this.ipc.send(this.channel, {
            action: UploadAction.StartJob,
            data,
        });
    }

    stopJob(data: StopJobMessage["data"]) {
        this.ipc.send(this.channel, {
            action: UploadAction.StopJob,
            data,
        });
    }

    removeJob(data: RemoveJobMessage["data"]) {
        this.ipc.send(this.channel, {
            action: UploadAction.RemoveJob,
            data,
        });
    }

    cleanUpJobs() {
        this.ipc.send(this.channel, {
            action: UploadAction.CleanupJobs,
            data: {},
        });
    }

    startAllJobs() {
        this.ipc.send(this.channel, {
            action: UploadAction.StartAllJobs,
            data: {},
        });
    }

    stopAllJobs() {
        this.ipc.send(this.channel, {
            action: UploadAction.StopAllJobs,
            data: {},
        });
    }

    removeAllJobs() {
        this.ipc.send(this.channel, {
            action: UploadAction.RemoveAllJobs,
            data: {},
        });
    }
}
