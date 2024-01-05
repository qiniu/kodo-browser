import {LogLevel} from "@renderer/modules/local-logger";
import {LangName} from "@renderer/modules/i18n";
import {serializer, LocalFile} from "@renderer/modules/persistence";

import UserConfigStore from "./user-config-store";
import handleLoadError from "@renderer/modules/user-config-store/error-handler";

export enum ContentViewStyle {
  Table = "table",
  Grid = "grid",
}

interface UploadPreferences {
  resumeUploadEnabled: boolean,
  multipartUploadThreshold: number,
  multipartUploadPartSize: number,
  multipartUploadConcurrency: number,
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
  logLevel: LogLevel, // isDebug
  autoUpdateAppEnabled: boolean, // autoUpgrade
  language: LangName,

  externalPathEnabled: boolean,
  filesItemLazyLoadEnabled: boolean,
  filesItemLoadSize: number,

  contentViewStyle: ContentViewStyle,
}

export type AppPreferencesData = UploadPreferences
  & DownloadPreferences
  & OthersPreferences;

const DEFAULT_APP_PREFERENCES_DATA: AppPreferencesData = {
  logLevel: LogLevel.Error,
  autoUpdateAppEnabled: false,

  resumeUploadEnabled: false,
  maxUploadConcurrency: 1,
  multipartUploadPartSize: 8,
  multipartUploadConcurrency: 1,
  multipartUploadThreshold: 100,
  uploadSpeedLimitEnabled: false,
  uploadSpeedLimitKbPerSec: 1024,
  skipEmptyDirectoryUpload: true,

  resumeDownloadEnabled: false,
  maxDownloadConcurrency: 1,
  multipartDownloadPartSize: 8,
  multipartDownloadThreshold: 100,
  downloadSpeedLimitEnabled: false,
  downloadSpeedLimitKbPerSec: 1024,
  overwriteDownloadEnabled: true,

  externalPathEnabled: false,
  filesItemLazyLoadEnabled: true,
  filesItemLoadSize: 100,

  language: LangName.ZH_CN,

  contentViewStyle: ContentViewStyle.Table,
};

const appPreferences = new UserConfigStore<AppPreferencesData>({
  defaultData: DEFAULT_APP_PREFERENCES_DATA,
  persistence: new LocalFile({
    filePath: "app_preferences.json",
    serializer: new serializer.JSONSerializer(),
  }),
  onLoadError: handleLoadError,
});

export default appPreferences;
