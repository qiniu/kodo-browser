export interface RegionSetting {
  identifier: string,
  label: string,
  endpoint: string,
}

export interface Endpoint {
  ucUrl: string,
  regions: RegionSetting[],
}
