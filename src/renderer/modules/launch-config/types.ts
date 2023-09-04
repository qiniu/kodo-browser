export interface LaunchConfigSetupOptions {
  launchConfig: LaunchConfig,
}

export interface LaunchConfig {
  preferredEndpointType?: string,
  defaultPrivateEndpointConfig?: DefaultPrivateEndpointConfig,
}

export interface DefaultPrivateEndpointConfig {
  ucUrl: string,
  regions: {
    id: string,
    label?: string,
    endpoint: string,
  }[],
}

export interface LaunchConfigPlugin {
  setup(options: LaunchConfigSetupOptions): void,
}
