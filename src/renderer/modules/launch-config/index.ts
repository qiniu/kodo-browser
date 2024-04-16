import path from "path";
import {app} from "@electron/remote";

import {LocalFile, serializer} from "@renderer/modules/persistence";

import {LaunchConfigPlugin} from "./types";
import DefaultPrivateEndpoint from "./default-private-endpoint";
import ChoreConfigs from "./chore-configs";
import DisableFunctions from "./disable-functions";
import PreferenceValidator from "./preference-validator";

class LaunchConfig {
  static basePath = path.dirname(app.getPath("exe"));
  static filePath = "launchConfig.json";

  setup() {
    const localFile = new LocalFile<any>({
      workingDirectory: LaunchConfig.basePath,
      filePath: LaunchConfig.filePath,
      serializer: new serializer.JSONSerializer(),
    });

    localFile.load().then(data => {
      if (!data) {
        return;
      }
    const plugins: LaunchConfigPlugin[] = [
      new ChoreConfigs(),
      new DefaultPrivateEndpoint(),
      new DisableFunctions(),
      new PreferenceValidator(),
    ];
    plugins.forEach(plugin => {
      plugin.setup({
        launchConfig: data,
      });
    });})
  }
}

export default LaunchConfig;
