import LaunchConfig from "@renderer/modules/launch-config";
import {appPreferences} from "@renderer/modules/user-config-store";
import * as LocalLogger from "@renderer/modules/local-logger"
import * as I18n from "@renderer/modules/i18n";
import * as auth from "@renderer/modules/auth";
import {shouldMigrate, getMigrator} from "@renderer/modules/update-app";

export default async function (): Promise<void> {
  // try to migrate
  const shouldMigrateRes = await shouldMigrate();
  if (shouldMigrateRes === "upgrade") {
    const migrator = await getMigrator();
    await migrator.upgrade();
  }

  // setup launch config
  new LaunchConfig().setup();

  // load application preferences from persistence
  await appPreferences.loadFromPersistence();
  appPreferences.watchPersistence();

  // initial application preferences
  LocalLogger.setLevel(appPreferences.get("logLevel"));
  await I18n.setLang(appPreferences.get("language"));

  // initial authorization
  await auth.loadPersistence();
};
