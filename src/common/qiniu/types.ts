import {Region} from "kodo-s3-adapter-sdk";

export enum BackendMode {
    Kodo = "kodo",
    S3 = "s3",
}

export interface ClientOptions {
    accessKey: string,
    secretKey: string,
    ucUrl: string,
    regions: Region[],
    backendMode: BackendMode,

    // storageClasses: StorageClass[], // TODO
}
