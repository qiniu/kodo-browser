import * as DefaultDict from "@renderer/modules/default-dict";

import {LaunchConfigPlugin, LaunchConfigSetupOptions} from "./types";

class ChoreConfigs implements LaunchConfigPlugin {
  setup(options: LaunchConfigSetupOptions) {
    if (options.launchConfig.preferredEndpointType) {
      DefaultDict.set("LOGIN_ENDPOINT_TYPE", options.launchConfig.preferredEndpointType);
    }
    if (options.launchConfig.baseShareUrl) {
      DefaultDict.set("BASE_SHARE_URL", options.launchConfig.baseShareUrl);
    }
    if (options.launchConfig.maxShareDirectoryExpireAfterSeconds) {
      DefaultDict.set("MAX_SHARE_DIRECTORY_EXPIRE_AFTER_SECONDS", options.launchConfig.maxShareDirectoryExpireAfterSeconds);
    }
  }
}

export default ChoreConfigs;
