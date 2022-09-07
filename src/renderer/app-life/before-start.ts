import * as LocalLogger from "@renderer/modules/local-logger"
import * as I18n from "@renderer/modules/i18n";

// lihs debug: remove in production env
// @ts-ignore
window.debugEnv = true;

const settings: Record<string, any> = {
  logLevel: LocalLogger.LogLevel.Debug,
  lang: I18n.LangName.ZH_CN,
}

export default async function (): Promise<void> {
  LocalLogger.setLevel(settings.logLevel);
  await I18n.setLang(settings.lang);
};
