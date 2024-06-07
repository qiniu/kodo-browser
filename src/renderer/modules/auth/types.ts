export enum EndpointType {
  Public = "public",
  Private = "private",
  ShareSession = "shareSession",
}

export interface AkItem {
  endpointType: EndpointType,
  accessKey: string,
  accessSecret: string,
  description?: string,
}

export interface ShareSession {
  sessionToken: string,
  bucketName: string,
  bucketId: string,
  regionS3Id: string,
  endpoint: string,
  prefix: string,
  permission: 'READONLY' | 'READWRITE',
  expires: string,
}
