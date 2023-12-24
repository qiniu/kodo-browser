export enum SettingStorageKey {
  IsDebug = "isDebug",
  AutoUpgrade = "autoUpgrade",

  // upload
  ResumeUpload = "resumeUpload",
  MaxUploadConcurrency = "maxUploadConcurrency",
  MultipartUploadSize = "multipartUploadSize",
  MultipartUploadThreshold = "multipartUploadThreshold",
  UploadSpeedLimitEnabled = "uploadSpeedLimitEnabled",
  UploadSpeedLimit = "uploadSpeedLimit",
  SkipEmptyDirectoryUpload = "empty-folder-uploading",

  // download
  ResumeDownload = "resumeDownload",
  MaxDownloadConcurrency = "maxDownloadConcurrency",
  MultipartDownloadSize = "multipartDownloadSize",
  MultipartDownloadThreshold = "multipartDownloadThreshold",
  DownloadSpeedLimitEnabled = "downloadSpeedLimitEnabled",
  DownloadSpeedLimit = "downloadSpeedLimit",
  OverwriteDownload = "overwrite-downloading",

  // others
  ExternalPathEnabled = "externalPathEnabled",
  StepByStepLoadingFiles = "stepByStepLoadingFiles",
  FilesLoadingSize = "filesLoadingSize",
  // HistoriesLength = "navHistoriesLength",
  Language = "lang",
  IsListView = "is-list-view",
}

interface UploadPreferences {
  resumeUploadEnabled: boolean,
  multipartUploadThreshold: number,
  multipartUploadPartSize: number,
  maxUploadConcurrency: number,
  uploadSpeedLimitEnabled: boolean,
  uploadSpeedLimitKbPerSec: number,
  skipEmptyDirectoryUpload: boolean,
}

interface DownloadPreferences {
  resumeDownloadEnabled: boolean,
  maxDownloadConcurrency: number,
  multipartDownloadThreshold: number,
  multipartDownloadPartSize: number,
  downloadSpeedLimitEnabled: boolean,
  downloadSpeedLimitKbPerSec: number,
  overwriteDownloadEnabled: boolean,
}

interface OthersPreferences {
  logLevel: 0 | 1 | 2 | 3 | 4 | 5, // isDebug
  autoUpdateAppEnabled: boolean, // autoUpgrade
  language: "zh_CN" | "en_US" | "ja_JP",

  externalPathEnabled: boolean,
  filesItemLazyLoadEnabled: boolean,
  filesItemLoadSize: number,

  contentViewStyle: "table" | "grid",
}

export type AppPreferencesData = UploadPreferences
  & DownloadPreferences
  & OthersPreferences;

export const appPreferenceKeys: (keyof AppPreferencesData)[] = [
  "resumeUploadEnabled",
  "multipartUploadThreshold",
  "multipartUploadPartSize",
  "maxUploadConcurrency",
  "uploadSpeedLimitEnabled",
  "uploadSpeedLimitKbPerSec",
  "skipEmptyDirectoryUpload",
  "resumeDownloadEnabled",
  "maxDownloadConcurrency",
  "multipartDownloadThreshold",
  "multipartDownloadPartSize",
  "downloadSpeedLimitEnabled",
  "downloadSpeedLimitKbPerSec",
  "overwriteDownloadEnabled",
  "logLevel",
  "autoUpdateAppEnabled",
  "language",
  "externalPathEnabled",
  "filesItemLazyLoadEnabled",
  "filesItemLoadSize",
  "contentViewStyle",
];

export type OldAkHistory = {
  historyItems: {
    accessKeyId: string,
    accessKeySecret: string,
    isPublicCloud: boolean,
    description?: string,
  }[],
}

export type AkHistory = {
  historyItems: {
    endpointType: "public" | "private",
    accessKey: string,
    accessSecret: string,
    description?: string,
  }[],
}

export type OldBookmarksContent = {
  homeAddress: {
    protocol: string,
    path: string,
  },
  bookmarks: {
    fullPath: string,
    timestamp: number,
  }[],
}

export type BookmarksContent = {
  homeAddress: {
    protocol: string,
    path: string,
  },
  list: {
    protocol: string,
    path: string,
    timestamp: number,
  }[],
}

export type OldExternalPath = {
  bucketId: string,
  fullPath: string,
  shortPath: string,
  regionId: string,
  objectPrefix: string,
}[];

export type ExternalPath = {
  list: {
    protocol: string,
    path: string,
    regionId: string,
  }[],
}
