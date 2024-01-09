import path from "path";
import os from "os";
import fsPromises from "fs/promises";

import {getDataStoreOrCreate} from "@main/kv-store";

import {
  AkHistory,
  AppPreferencesData,
  BookmarksContent,
  DownloadJobPersistInfo,
  ExternalPath,
  OldAkHistory,
  OldBookmarksContent,
  OldDownloadJobPersistInfo,
  OldExternalPath,
  OldUploadJobPersistInfo,
  SettingStorageKey,
  UploadJobPersistInfo,
} from "./types";

const configPath = path.join(os.homedir(), ".kodo-browser");

export default async function () {
  await migratePreferences();

  // below migrate date in config path.
  // if config path isn't existing, no data need to migrate
  try {
    await fsPromises.access(configPath);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return;
    }
    throw err;
  }

  await migrateAkHistory();

  const filenames = await fsPromises.readdir(configPath)
  const ex = /(?<type>bookmarks|external_paths|upprog|downprog)_(?<ak>.+).json/;
  for (const fName of filenames) {
    const matchRes = fName.match(ex);
    if (!matchRes || !matchRes.groups?.["ak"]) {
      continue;
    }
    const ak = matchRes.groups["ak"];
    const filePath = path.join(configPath, fName);
    if (ak === "undefined") {
      await fsPromises.unlink(filePath);
      continue;
    }
    const profileDirPath = path.join(configPath, `profile_${ak}`);
    try {
      await fsPromises.access(profileDirPath);
    } catch {
      await fsPromises.mkdir(profileDirPath);
    }
    switch (matchRes.groups?.["type"]) {
      case "bookmarks":
        await migrateBookmarks(ak, filePath);
        break;
      case "external_paths":
        await migrateExternalPaths(ak, filePath);
        break;
      case "upprog":
        await migrateTransferJobs(ak, filePath, "upload_prog");
        break;
      case "downprog":
        await migrateTransferJobs(ak, filePath, "download_prog");
        break;
    }
  }
}

async function migratePreferences() {
  const old2new: Record<
    SettingStorageKey,
    (v: string) => Partial<AppPreferencesData>
  > = {
    [SettingStorageKey.IsDebug]: v => ({
      // v === 0 is not debug, meaning log level error(4)
      logLevel: !parseInt(v) ? 4 : 1,
    }),
    [SettingStorageKey.AutoUpgrade]: v => ({
      autoUpdateAppEnabled: Boolean(parseInt(v)),
    }),

    // upload
    [SettingStorageKey.ResumeUpload]: v => ({
      resumeUploadEnabled: Boolean(parseInt(v)),
    }),
    [SettingStorageKey.MaxUploadConcurrency]: v => ({
      maxUploadConcurrency: parseInt(v),
    }),
    [SettingStorageKey.MultipartUploadSize]: v => ({
      multipartUploadPartSize: parseInt(v),
    }),
    [SettingStorageKey.MultipartUploadThreshold]: v => ({
      multipartUploadThreshold: parseInt(v),
    }),
    [SettingStorageKey.UploadSpeedLimitEnabled]: v => ({
      uploadSpeedLimitEnabled: Boolean(parseInt(v)),
    }),
    [SettingStorageKey.UploadSpeedLimit]: v => ({
      uploadSpeedLimitKbPerSec: parseInt(v),
    }),
    [SettingStorageKey.SkipEmptyDirectoryUpload]: v => ({
      skipEmptyDirectoryUpload: v === "true",
    }),

    // download
    [SettingStorageKey.ResumeDownload]: v => ({
      resumeDownloadEnabled: Boolean(parseInt(v)),
    }),
    [SettingStorageKey.MaxDownloadConcurrency]: v => ({
      maxDownloadConcurrency: parseInt(v),
    }),
    [SettingStorageKey.MultipartDownloadSize]: v => ({
      multipartDownloadPartSize: parseInt(v),
    }),
    [SettingStorageKey.MultipartDownloadThreshold]: v => ({
      multipartDownloadThreshold: parseInt(v),
    }),
    [SettingStorageKey.DownloadSpeedLimitEnabled]: v => ({
      downloadSpeedLimitEnabled: Boolean(parseInt(v)),
    }),
    [SettingStorageKey.DownloadSpeedLimit]: v => ({
      downloadSpeedLimitKbPerSec: parseInt(v),
    }),
    [SettingStorageKey.OverwriteDownload]: v => ({
      overwriteDownloadEnabled: v === "true",
    }),

    // others
    [SettingStorageKey.ExternalPathEnabled]: v => ({
      externalPathEnabled: Boolean(parseInt(v)),
    }),
    [SettingStorageKey.StepByStepLoadingFiles]: v => ({
      filesItemLazyLoadEnabled: Boolean(parseInt(v)),
    }),
    [SettingStorageKey.FilesLoadingSize]: v => ({
      filesItemLoadSize: parseInt(v),
    }),
    [SettingStorageKey.Language]: v => ({
      language: v.replace("-", "_") as any,
    }),
    [SettingStorageKey.IsListView]: v => ({
      contentViewStyle: v === "true" ? "table" : "grid",
    }),
  }

  let preferences: Partial<AppPreferencesData> = {};
  for (const k of Object.values(SettingStorageKey)) {
    const v = localStorage.getItem(k);
    if (!v) {
      continue
    }
    preferences = {
      ...preferences,
      ...old2new[k](v),
    };
    localStorage.removeItem(k);
  }
  if (!Object.keys(performance).length) {
    return;
  }
  try {
    await fsPromises.access(configPath);
  } catch {
    await fsPromises.mkdir(configPath);
  }
  const confFilePath = path.join(configPath, "app_preferences.json");
  await fsPromises.writeFile(confFilePath, JSON.stringify(preferences));
}

async function migrateAkHistory() {
  const filePath = path.join(configPath, "ak_histories.json");
    try {
    await fsPromises.access(filePath);
  } catch {
    return;
  }
  const oldContentBuf = await fsPromises.readFile(filePath);
  const oldContent: OldAkHistory = JSON.parse(oldContentBuf.toString());
  const content: AkHistory = {
    historyItems: [],
  };
  for (const i of oldContent.historyItems) {
    content.historyItems.push({
      endpointType: i.isPublicCloud ? "public" : "private",
      accessKey: i.accessKeyId,
      accessSecret: i.accessKeySecret,
      description: i.description,
    })
  }
  await fsPromises.writeFile(filePath, JSON.stringify(content));
}

const pathEx = /(?<protocol>[a-zA-Z0-9\-_]+:\/\/)(?<path>.+)/;

async function migrateBookmarks(ak: string, filePath: string) {
  const oldContentBuf = await fsPromises.readFile(filePath);
  const oldContent: OldBookmarksContent = JSON.parse(oldContentBuf.toString());
  const content: BookmarksContent = {
    homeAddress: oldContent.homeAddress,
    list: [],
  };
  for (const b of oldContent.bookmarks) {
    const exRes = b.fullPath.match(pathEx);
    if (!exRes || !exRes.groups) {
      continue;
    }
    content.list.push({
      protocol: exRes.groups["protocol"],
      path: exRes.groups["path"],
      timestamp: b.timestamp,
    });
  }
  await fsPromises.writeFile(
    path.join(configPath, `profile_${ak}`, "bookmarks.json"),
    JSON.stringify(content),
  );
  await fsPromises.unlink(filePath);
}

async function migrateExternalPaths(ak: string, filePath: string) {
  const oldContentBuf = await fsPromises.readFile(filePath);
  const oldContent: OldExternalPath = JSON.parse(oldContentBuf.toString());
  const content: ExternalPath = {
    list: [],
  };
  for (const p of oldContent) {
    const exRes = p.fullPath.match(pathEx);
    if (!exRes || !exRes.groups) {
      continue;
    }
    content.list.push({
      protocol: exRes.groups["protocol"],
      path: exRes.groups["path"],
      regionId: p.regionId,
    });
  }
  await fsPromises.writeFile(
    path.join(configPath, `profile_${ak}`, "external_paths.json"),
    JSON.stringify(content),
  );
  await fsPromises.unlink(filePath);
}

const MAX_LOOP_ID_COUNTER = 10000;
let loopIdCounter = Math.floor(Math.random() * MAX_LOOP_ID_COUNTER);

function isUploadJob(
  oldInfo: OldUploadJobPersistInfo | OldDownloadJobPersistInfo
): oldInfo is OldUploadJobPersistInfo {
  return Object.hasOwn(oldInfo, "uploadedParts");
}

function migrateJobInfo(
  oldId: string,
  oldInfo: OldUploadJobPersistInfo | OldDownloadJobPersistInfo,
): [string, UploadJobPersistInfo | DownloadJobPersistInfo] {
  const [, ts] = oldId.split('-', 2);
  const loopIdCounterStr = loopIdCounter.toString()
    .padStart(Math.ceil(Math.log10(MAX_LOOP_ID_COUNTER)), "0");
  const id = `j-${ts}-${loopIdCounterStr}`;
  loopIdCounter = (loopIdCounter + 1) % MAX_LOOP_ID_COUNTER;
  let info: UploadJobPersistInfo | DownloadJobPersistInfo;
  if (isUploadJob(oldInfo)) {
    info = {
      ...oldInfo,
      uploadedParts: oldInfo.uploadedParts.map(p => ({
        partNumber: p.PartNumber,
        etag: p.ETag,
      })),
    };
  } else {
    info = {
      ...oldInfo,
    }
  }
  info.message = typeof oldInfo.message === "string"
    ? oldInfo.message
    : JSON.stringify(oldInfo.message)
  info.status = ["waiting", "running"].includes(oldInfo.status)
    ? "stopped"
    : oldInfo.status;
  info.storageClasses = oldInfo.storageClasses.map(c => ({
    kodoName: c.kodoName,
    fileType: c.fileType,
    s3Name: c.s3Name,
  }));
  return [id, info];
}

async function migrateTransferJobs(
  ak: string,
  filePath: string,
  type: "upload_prog" | "download_prog",
) {
  const basedir = path.join(configPath, `profile_${ak}`, type);
  const contentBuf = await fsPromises.readFile(filePath);
  const oldContent = JSON.parse(contentBuf.toString()) as Record<string, OldUploadJobPersistInfo | OldDownloadJobPersistInfo>;
  const dataStore = await getDataStoreOrCreate<UploadJobPersistInfo | DownloadJobPersistInfo>({
    workingDirectory: basedir,
  });
  for (const [oldId, oldInfo] of Object.entries(oldContent)) {
    const [id, info] = migrateJobInfo(oldId, oldInfo);
    await dataStore.set(id, info);
  }
  await dataStore.compact(true);
  await dataStore.close();
}
