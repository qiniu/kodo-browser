export enum EndpointType {
  Public = "public",
  Private = "private",
}

export interface AkItem {
  endpointType: EndpointType,
  accessKey: string,
  accessSecret: string,
  description?: string,
}
