import path from "path";
import os from "os";
import fsPromises from "fs/promises";

import {
  AkHistory,
  appPreferenceKeys,
  AppPreferencesData,
  BookmarksContent,
  ExternalPath, OldAkHistory,
  OldBookmarksContent,
  OldExternalPath,
  SettingStorageKey,
} from "./types";

const configPath = path.join(os.homedir(), ".kodo-browser");

const new2old: {
  [K in keyof AppPreferencesData]: (v: AppPreferencesData[K]) => [SettingStorageKey, string]
} = {
  // only when log level is debug(1) set debug mode
  logLevel: v => [
    SettingStorageKey.IsDebug,
    v === 1 ? "1" : "0"
  ],
  autoUpdateAppEnabled: v => [
    SettingStorageKey.AutoUpgrade,
    v ? "1" : "0",
  ],
  // upload
  resumeUploadEnabled: v => [
    SettingStorageKey.ResumeUpload,
    v ? "1" : "0",
  ],
  maxUploadConcurrency: v => [
    SettingStorageKey.MaxUploadConcurrency,
    v.toString(),
  ],
  multipartUploadPartSize: v => [
    SettingStorageKey.MultipartUploadSize,
    v.toString(),
  ],
  multipartUploadThreshold: v => [
    SettingStorageKey.MultipartUploadThreshold,
    v.toString(),
  ],
  uploadSpeedLimitEnabled: v => [
    SettingStorageKey.UploadSpeedLimitEnabled,
    v ? "1" : "0",
  ],
  uploadSpeedLimitKbPerSec: v => [
    SettingStorageKey.UploadSpeedLimit,
    v.toString(),
  ],
  skipEmptyDirectoryUpload: v => [
    SettingStorageKey.SkipEmptyDirectoryUpload,
    v ? "true" : "false",
  ],

  // download
  resumeDownloadEnabled: v => [
    SettingStorageKey.ResumeDownload,
    v ? "1" : "0",
  ],
  maxDownloadConcurrency: v => [
    SettingStorageKey.MaxDownloadConcurrency,
    v.toString(),
  ],
  multipartDownloadPartSize: v => [
    SettingStorageKey.MultipartDownloadSize,
    v.toString(),
  ],
  multipartDownloadThreshold: v => [
    SettingStorageKey.MultipartDownloadThreshold,
    v.toString(),
  ],
  downloadSpeedLimitEnabled: v => [
    SettingStorageKey.DownloadSpeedLimitEnabled,
    v ? "1" : "0",
  ],
  downloadSpeedLimitKbPerSec: v => [
    SettingStorageKey.DownloadSpeedLimit,
    v.toString(),
  ],
  overwriteDownloadEnabled: v => [
    SettingStorageKey.OverwriteDownload,
    v ? "true" : "false",
  ],

  // others
  externalPathEnabled: v => [
    SettingStorageKey.ExternalPathEnabled,
    v ? "1" : "0",
  ],
  filesItemLazyLoadEnabled: v => [
    SettingStorageKey.StepByStepLoadingFiles,
    v ? "1" : "0",
  ],
  filesItemLoadSize: v => [
    SettingStorageKey.FilesLoadingSize,
    v.toString(),
  ],
  language: v => [
    SettingStorageKey.Language,
    v.replace("_", "-"),
  ],
  contentViewStyle: v => [
    SettingStorageKey.IsListView,
    v ? "true" : "false",
  ],
}

async function migratePreferences() {
  const confFilePath = path.join(configPath, "app_preferences.json");
  const confBuf = await fsPromises.readFile(confFilePath);
  const conf: Partial<AppPreferencesData> = JSON.parse(confBuf.toString());
  for (const k of appPreferenceKeys) {
    if (conf[k] === undefined) {
      continue;
    }
    // @ts-ignore
    const [oldK, oldV] = new2old[k](conf[k]);
    localStorage.setItem(oldK, oldV);
  }
  await fsPromises.unlink(confFilePath);
}

async function migrateAkHistory() {
  const filePath = path.join(configPath, "ak_histories.json");
  const contentBuf = await fsPromises.readFile(filePath);
  const content: AkHistory = JSON.parse(contentBuf.toString());
  const oldContent: OldAkHistory = {
    historyItems: [],
  };
  for (const i of content.historyItems) {
    oldContent.historyItems.push({
      accessKeyId: i.accessKey,
      accessKeySecret: i.accessSecret,
      isPublicCloud: i.endpointType === "public",
      description: i.description,
    })
  }
  await fsPromises.writeFile(filePath, JSON.stringify(content));
}

async function migrateBookmarks(ak: string, filePath: string) {
  const contentBuf = await fsPromises.readFile(filePath);
  const content: BookmarksContent = JSON.parse(contentBuf.toString());
  const oldContent: OldBookmarksContent = {
    homeAddress: content.homeAddress,
    bookmarks: [],
  }
  for (const b of content.list) {
    oldContent.bookmarks.push({
      fullPath: b.protocol + b.path,
      timestamp: b.timestamp,
    });
  }
  await fsPromises.writeFile(
    path.join(configPath, `bookmarks_${ak}.json`),
    JSON.stringify(oldContent),
  );
  await fsPromises.unlink(filePath);
}

async function migrateExternalPaths(ak: string, filePath: string) {
  const contentBuf = await fsPromises.readFile(filePath);
  const content: ExternalPath = JSON.parse(contentBuf.toString());
  const oldContent: OldExternalPath = [];
  for (const p of content.list) {
    let shortPath = p.path;
    if (shortPath.endsWith("/")) {
      shortPath = shortPath.slice(0, -1);
    }
    const [bucketId] = shortPath.split("/", 1);

    oldContent.push({
      bucketId: bucketId,
      fullPath: `${p.protocol}${shortPath}`,
      shortPath: shortPath,
      regionId: p.regionId,
      objectPrefix: shortPath.slice(`${bucketId}/`.length),
    });
  }
  await fsPromises.writeFile(
    path.join(configPath, `external_paths_${ak}.json`),
    JSON.stringify(oldContent),
  );
  await fsPromises.unlink(filePath);
}

async function migrateTransferJobs(
  ak: string,
  filePath: string,
  type: "upprog" | "downprog",
) {
  await fsPromises.rename(
    filePath,
    path.join(configPath, `${type}_${ak}.json`),
  );
}

export default async function () {
  await migratePreferences();
  await migrateAkHistory();

  const filenames = await fsPromises.readdir(configPath)
  const ex = /profile_(?<ak>.+)/;
  for (const fName of filenames) {
    const matchRes = fName.match(ex);
    if (!matchRes || !matchRes.groups?.["ak"]) {
      continue;
    }
    await migrateBookmarks(
      matchRes.groups["ak"],
      path.join(configPath, fName, "bookmarks.json")
    );
    await migrateExternalPaths(
      matchRes.groups["ak"],
      path.join(configPath, fName, "external_paths.json")
    );
    await migrateTransferJobs(
      matchRes.groups["ak"],
      path.join(configPath, fName, "upload_progress.json"),
      "upprog",
    );
    await migrateTransferJobs(
      matchRes.groups["ak"],
      path.join(configPath, fName, "download_progress.json"),
      "downprog",
    );
  }
}
