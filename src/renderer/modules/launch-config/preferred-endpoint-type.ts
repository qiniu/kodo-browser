import {LaunchConfigPlugin, LaunchConfigSetupOptions} from "@renderer/modules/launch-config/types";

class PreferredEndpointType implements LaunchConfigPlugin {
  static preferredEndpointType = "public";
  setup(options: LaunchConfigSetupOptions) {
    if (options.launchConfig.preferredEndpointType) {
      PreferredEndpointType.preferredEndpointType = options.launchConfig.preferredEndpointType;
    }
  }
}

export default PreferredEndpointType;
