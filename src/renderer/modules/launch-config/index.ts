import path from "path";
import {app} from "@electron/remote";

import {LocalFile, serializer} from "@renderer/modules/persistence";

import {LaunchConfigPlugin} from "./types";
import DefaultPrivateEndpoint from "./default-private-endpoint";
import PreferredEndpointType from "./preferred-endpoint-type";

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
        new PreferredEndpointType(),
        new DefaultPrivateEndpoint(),
      ];
      plugins.forEach(plugin => {
        plugin.setup({
          launchConfig: data,
        });
      });
    })

  }
}

export default LaunchConfig;
