import path from "path";
import {app} from "@electron/remote";

import {LocalFile} from "@renderer/modules/persistence";

import {LaunchConfigPlugin} from "./types";
import DefaultPrivateEndpoint from "./default-private-endpoint";
import PreferredEndpointType from "./preferred-endpoint-type";

class LaunchConfig {
  static Path = "launchConfig.json";

  setup() {
    const localFile = new LocalFile(
      path.dirname(app.getPath("exe"))
    );
    const jsonStrData = localFile
      .read(LaunchConfig.Path)
      .toString();
    if (!jsonStrData) {
      return;
    }
    const data = JSON.parse(jsonStrData);

    const plugins: LaunchConfigPlugin[] = [
      new PreferredEndpointType(),
      new DefaultPrivateEndpoint(),
    ];
    plugins.forEach(plugin => {
      plugin.setup({
        launchConfig: data,
      });
    });
  }
}

export default LaunchConfig;
