import * as DefaultDict from "@renderer/modules/default-dict";

import {LaunchConfigPlugin, LaunchConfigSetupOptions} from "./types";

class PreferenceValidator implements LaunchConfigPlugin {
  setup(options: LaunchConfigSetupOptions) {
    if (!options.launchConfig.preferenceValidators) {
      return;
    }
    const defaultPreferenceValidators = options.launchConfig.preferenceValidators;
    DefaultDict.set("PREFERENCE_VALIDATORS", defaultPreferenceValidators);
  }
}

export default PreferenceValidator;
