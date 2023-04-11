import {LangName} from "@renderer/modules/i18n";

export interface SettingsUploadFormData {
  enabledResumeUpload: boolean,
  multipartUploadThreshold: number,
  multipartUploadPartSize: number,
  maxUploadConcurrency: number,
  enabledUploadSpeedLimit: boolean,
  uploadSpeedLimit: number,
}

export interface SettingsDownloadFormData {
  enabledResumeDownload: boolean,
  multipartDownloadThreshold: number,
  multipartDownloadPartSize: number,
  maxDownloadConcurrency: number,
  enabledDownloadSpeedLimit: boolean,
  downloadSpeedLimit: number,
}

export interface ExternalPathFormData {
  enabledExternalPath: boolean,
}

export interface OthersFormData {
  enabledDebugLog: boolean,
  enabledLoadFilesOnTouchEnd: boolean,
  loadFilesNumberPerPage: number,
  enabledAutoUpdateApp: boolean,
  language: LangName,
}

export type SettingsFormData =
  SettingsUploadFormData
  & SettingsDownloadFormData
  & ExternalPathFormData
  & OthersFormData;
