import Settings from "@renderer/modules/settings";
import * as LocalLogger from "@renderer/modules/local-logger"
import * as I18n from "@renderer/modules/i18n";

export default async function (): Promise<void> {
  if (Settings.isDebug) {
    LocalLogger.setLevel(LocalLogger.LogLevel.Debug);
  } else {
    LocalLogger.setLevel(LocalLogger.LogLevel.Error);
  }
  await I18n.setLang(Settings.language);
};
