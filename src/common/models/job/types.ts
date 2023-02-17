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

export interface LocalPath {
    name: string,
    path: string,
    size?: number, // bytes
    mtime?: number, // ms timestamp
}

export interface RemotePath {
    bucket: string,
    key: string,
    size?: number, // bytes
    mtime?: number, // ms timestamp
}

export interface ProgressCallbackParams {
  transferred: number,
  total: number,
  speed: number,
  eta: number,
}

export function isLocalPath(p: LocalPath | RemotePath): p is LocalPath {
    return p.hasOwnProperty("name");
}
