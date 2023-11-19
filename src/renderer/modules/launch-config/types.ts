export interface LaunchConfigSetupOptions {
  launchConfig: LaunchConfig,
}

export interface LaunchConfig {
  preferredEndpointType?: string,
  defaultPrivateEndpointConfig?: DefaultPrivateEndpointConfig,
  disable: DisableFunctions,
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

export interface LaunchConfigPlugin {
  setup(options: LaunchConfigSetupOptions): void,
}
