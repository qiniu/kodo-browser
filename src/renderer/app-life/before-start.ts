import * as LocalLogger from "@renderer/modules/local-logger"

// lihs debug: remove in production env
// @ts-ignore
window.debugEnv = true;

const settings: Record<string, any> = {
  logLevel: LocalLogger.LogLevel.Debug,
}

export default async function (): Promise<void> {
  LocalLogger.setLevel(settings.logLevel);
};
