import { Region } from "kodo-s3-adapter-sdk";
import { StorageClass } from "kodo-s3-adapter-sdk/dist/adapter";
import { NatureLanguage } from "kodo-s3-adapter-sdk/dist/uplog";

// job constructor options
export type BackendMode = "kodo" | "s3";

export interface UploadedPart {
    partNumber: number,
    etag: string,
}

export enum Status {
    Waiting = "waiting",
    Running = "running",
    Stopped = "stopped",
    Finished = "finished",
    Failed = "failed",
    Duplicated = "duplicated",
    Verifying = "verifying"
}

// ipc-job
export enum IpcJobEvent {
    Upload = "job-upload",
    Download = "job-download",
    Stop = "job-stop",
}

export interface IpcUploadJob {
    job: string,
    key: IpcJobEvent.Upload,
    clientOptions: {
        accessKey: string,
        secretKey: string,
        ucUrl?: string,
        regions: Region[],
        backendMode: BackendMode,

        userNatureLanguage: NatureLanguage,
    },
    options: {
        resumeUpload: boolean,
        maxConcurrency: number,
        multipartUploadThreshold: number,
        multipartUploadSize: number,
        uploadSpeedLimit: number,
        kodoBrowserVersion: string,
    },
    params: {
        region: string,
        bucket: string,
        key: string,
        localFile: string,
        isDebug: boolean,
        uploadedId?: string,
        uploadedParts?: UploadedPart[],
        overwriteDup: boolean,
        storageClassName: StorageClass,
    }
}

export interface IpcDownloadJob {
    job: string,
    key: IpcJobEvent.Download,
    clientOptions: {
        accessKey: string,
        secretKey: string,
        ucUrl?: string,
        regions: Region[],
        backendMode: BackendMode,

        userNatureLanguage: NatureLanguage,
    },
    options: {
        resumeDownload: boolean,
        maxConcurrency: number,
        multipartDownloadThreshold: number,
        multipartDownloadSize: number,
        downloadSpeedLimit: number,
        kodoBrowserVersion: string,
    },
    params: {
        region: string,
        bucket: string,
        key: string,
        localFile: string,
        isDebug: boolean,
        domain?: string,
        downloadedBytes?: number,
    },
}

export enum EventKey {
    Duplicated = "fileDuplicated",
    Stat = "fileStat",
    Progress = "progress",
    PartUploaded = "filePartUploaded",
    PartDownloaded = "filePartDownloaded",
    Uploaded = "fileUploaded",
    Downloaded = "fileDownloaded",
    Error = "error",
    Debug = "debug",
}
