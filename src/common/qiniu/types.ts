import {Region} from "kodo-s3-adapter-sdk";

export enum BackendMode {
    Kodo = "kodo",
    S3 = "s3",
}

interface ClientOptionsBase {
  accessKey: string,
  secretKey: string,
  ucUrl: string,
  backendMode: BackendMode,
}

export interface ClientOptions extends ClientOptionsBase{
  regions: Region[],
}

export interface ClientOptionsSerialized extends ClientOptionsBase{
    regions: {
      id: string,
      s3Id: string,
      label: string,
      s3Urls: string[],
    }[],
}
