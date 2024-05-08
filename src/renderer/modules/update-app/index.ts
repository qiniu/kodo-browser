
export {
  fetchLatestVersion,
  fetchReleaseNote,
  fetchUpdate,
} from "./fetch-version";
export {
  downloadLatestVersion,
} from "./download-whole";

import fsPromises from "fs/promises";
import path from "path";
import {app, config_path} from "@common/const/app-config";
import {Migrator} from "./migrator";
import {compareVersion} from "./utils";

async function prevVersionGetter(): Promise<string> {
  const currVersionFilePath = path.join(config_path, ".prev_version");
  let version: string;
  try {
    version = (await fsPromises.readFile(currVersionFilePath)).toString();
  } catch {
    // v2.1.2 is the first version added migrator
    version = "2.1.2";
  }
  return version;
}

async function currVersionGetter(): Promise<string> {
  return app.version;
}

async function prevVersionSetter(version: string): Promise<void> {
  const currVersionFilePath = path.join(config_path, ".prev_version");
  try {
    await fsPromises.access(config_path);
  } catch {
    await fsPromises.mkdir(config_path, {recursive: true});
  }
  await fsPromises.writeFile(currVersionFilePath, version);
}

export async function shouldMigrate(): Promise<false | "upgrade" | "downgrade"> {
  const prev = await prevVersionGetter();
  const curr = await currVersionGetter();
  const res = compareVersion(curr, prev);
  if (res === 0) {
    return false;
  } else if (res > 0) {
    return "upgrade";
  } else {
    return "downgrade";
  }
}

export async function getMigrator(): Promise<Migrator> {
  const result = new Migrator({
    prevVersionGetter,
    currVersionGetter,
    prevVersionSetter,
  });

  const migrateSteps = await import("./migrate-steps");
  result.register(...Object.values(migrateSteps));

  return result;
}
