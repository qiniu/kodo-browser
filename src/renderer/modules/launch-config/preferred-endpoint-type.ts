import * as DefaultDict from "@renderer/modules/default-dict";

import {LaunchConfigPlugin, LaunchConfigSetupOptions} from "./types";

class PreferredEndpointType implements LaunchConfigPlugin {
  setup(options: LaunchConfigSetupOptions) {
    if (options.launchConfig.preferredEndpointType) {
      DefaultDict.set("LOGIN_ENDPOINT_TYPE", options.launchConfig.preferredEndpointType);
    }
  }
}

export default PreferredEndpointType;
