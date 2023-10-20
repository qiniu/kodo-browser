import Settings from "@renderer/modules/settings";
import * as LocalLogger from "@renderer/modules/local-logger"
import * as I18n from "@renderer/modules/i18n";
import LaunchConfig from "@renderer/modules/launch-config";

export default async function (): Promise<void> {
  new LaunchConfig().setup();
  if (Settings.isDebug) {
    LocalLogger.setLevel(LocalLogger.LogLevel.Debug);
  } else {
    LocalLogger.setLevel(LocalLogger.LogLevel.Error);
  }
  await I18n.setLang(Settings.language);
};
