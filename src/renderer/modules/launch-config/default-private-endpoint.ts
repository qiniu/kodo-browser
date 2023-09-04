import {localFile} from "@renderer/modules/persistence";
import {PrivateEndpointPersistence, privateEndpointPersistence} from "@renderer/modules/qiniu-client";

import {LaunchConfigSetupOptions, LaunchConfig, LaunchConfigPlugin} from "./types";

class DefaultPrivateEndpoint implements LaunchConfigPlugin {
  setup(options: LaunchConfigSetupOptions) {
    if (this.shouldRefer(options.launchConfig)) {
      privateEndpointPersistence.saveRefer({
        referTo: options.launchConfigPath,
        keyPath: ["defaultPrivateEndpointConfig"],
      });
    }
  }

  private shouldRefer(launchConfig: LaunchConfig) {
    if (!launchConfig.defaultPrivateEndpointConfig) {
      return false;
    }

    const jsonStrData = localFile.read(PrivateEndpointPersistence.Path).toString();
    if (!jsonStrData) {
      return true;
    }
    const data = JSON.parse(jsonStrData);
    if (data.hasOwnProperty("refer_to")) {
      return true;
    }
    return false;
  }
}

export default DefaultPrivateEndpoint;
