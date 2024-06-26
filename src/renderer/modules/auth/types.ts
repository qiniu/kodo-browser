export enum EndpointType {
  Public = "public",
  Private = "private",
  ShareSession = "shareSession",
}

export enum AkSpecialType {
  IAM = "IAM",
  STS = "STS",
}

export interface AkItem {
  endpointType: EndpointType,
  accessKey: string,
  accessSecret: string,
  specialType?: AkSpecialType,
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
