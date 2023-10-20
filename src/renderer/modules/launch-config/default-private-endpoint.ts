import * as DefaultDict from "@renderer/modules/default-dict";
import {LaunchConfigSetupOptions, LaunchConfigPlugin} from "./types";

class DefaultPrivateEndpoint implements LaunchConfigPlugin {
  setup({launchConfig}: LaunchConfigSetupOptions) {
    if (!launchConfig.defaultPrivateEndpointConfig) {
      return;
    }
    const defaultPrivateEndpointConfig = launchConfig.defaultPrivateEndpointConfig;
    DefaultDict.set("PRIVATE_ENDPOINT", {
      ucUrl: defaultPrivateEndpointConfig.ucUrl,
      regions: defaultPrivateEndpointConfig.regions.map(r => ({
        identifier: r.id,
        label: r.label ?? "",
        endpoint: r.endpoint,
      })),
    });
  }
}

export default DefaultPrivateEndpoint;
