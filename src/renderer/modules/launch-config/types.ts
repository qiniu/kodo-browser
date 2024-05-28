export interface LaunchConfigSetupOptions {
  launchConfig: LaunchConfig,
}

export interface LaunchConfig {
  preferredEndpointType?: string,
  defaultPrivateEndpointConfig?: DefaultPrivateEndpointConfig,
  preferenceValidators?: PreferenceValidators,
  baseShareUrl?: string,
  maxShareDirectoryExpireAfterSeconds?: number,
  disable?: DisableFunctions,
}

export interface DefaultPrivateEndpointConfig {
  ucUrl: string,
  regions: {
    id: string,
    label?: string,
    endpoint: string,
  }[],
}

export interface DisableFunctions {
  nonOwnedDomain?: boolean,
}

export interface PreferenceValidators {
  maxMultipartUploadPartSize?: number,
  maxMultipartUploadConcurrency?: number,
  maxUploadJobConcurrency?: number,
  maxDownloadJobConcurrency?: number,
}

export interface LaunchConfigPlugin {
  setup(options: LaunchConfigSetupOptions): void,
}
