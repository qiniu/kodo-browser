// job constructor options
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
