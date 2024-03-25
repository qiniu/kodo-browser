import * as DefaultDict from "@renderer/modules/default-dict";

import {LaunchConfigPlugin, LaunchConfigSetupOptions} from "./types";

class DisableFunctions implements LaunchConfigPlugin {
  setup(options: LaunchConfigSetupOptions) {
    if (!options.launchConfig.disable) {
      return;
    }
    if (options.launchConfig.disable.nonOwnedDomain !== undefined) {
      DefaultDict.set("DISABLE_NON_OWNED_DOMAIN", options.launchConfig.disable.nonOwnedDomain);
    }
  }
}

export default DisableFunctions;
