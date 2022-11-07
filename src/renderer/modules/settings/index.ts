import ByteSize from "@common/const/byte-size";
import ipcUploadManager from "@renderer/modules/electron-ipc-manages/ipc-upload-manager";
import ipcDownloadManager from "@renderer/modules/electron-ipc-manages/ipc-download-manager";
import {LangName} from "@renderer/modules/i18n";
import * as LocalLogger from "@renderer/modules/local-logger";

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
  HistoriesLength = "navHistoriesLength",
  Language = "lang",
}

export enum SettingKey {
  IsDebug = "isDebug",
  AutoUpgrade = "autoUpgrade",
  ResumeUpload = "resumeUpload",
  MaxUploadConcurrency = "maxUploadConcurrency",
  MultipartUploadSize = "multipartUploadSize",
  MultipartUploadThreshold = "multipartUploadThreshold",
  UploadSpeedLimitEnabled = "uploadSpeedLimitEnabled",
  UploadSpeedLimitKbPerSec = "uploadSpeedLimitKbPerSec",
  ResumeDownload = "resumeDownload",
  SkipEmptyDirectoryUpload = "skipEmptyDirectoryUpload",
  MaxDownloadConcurrency = "maxDownloadConcurrency",
  MultipartDownloadSize = "multipartDownloadSize",
  MultipartDownloadThreshold = "multipartDownloadThreshold",
  DownloadSpeedLimitEnabled = "downloadSpeedLimitEnabled",
  DownloadSpeedLimitKbPerSec = "downloadSpeedLimitKbPerSec",
  OverwriteDownload = "overwriteDownload",
  ExternalPathEnabled = "externalPathEnabled",
  StepByStepLoadingFiles = "stepByStepLoadingFiles",
  FilesLoadingSize = "filesLoadingSize",
  HistoriesLength = "historiesLength",
  Language = "language",
}

interface NumberSettingsChange {
  key: SettingKey.IsDebug
    | SettingKey.AutoUpgrade
    | SettingKey.ResumeUpload
    | SettingKey.MaxUploadConcurrency
    | SettingKey.MultipartUploadSize
    | SettingKey.MultipartUploadThreshold
    | SettingKey.UploadSpeedLimitEnabled
    | SettingKey.UploadSpeedLimitKbPerSec
    | SettingKey.ResumeDownload
    | SettingKey.MaxDownloadConcurrency
    | SettingKey.MultipartDownloadSize
    | SettingKey.MultipartDownloadThreshold
    | SettingKey.DownloadSpeedLimitEnabled
    | SettingKey.DownloadSpeedLimitKbPerSec
    | SettingKey.ExternalPathEnabled
    | SettingKey.StepByStepLoadingFiles
    | SettingKey.FilesLoadingSize
    | SettingKey.HistoriesLength,
  value: number,
}

interface BooleanSettingsChange {
  key: SettingKey.SkipEmptyDirectoryUpload
    | SettingKey.OverwriteDownload,
  value: boolean,
}

interface LangNameSettingsChange {
  key: SettingKey.Language,
  value: LangName,
}

type SettingsChange = NumberSettingsChange
  | BooleanSettingsChange
  | LangNameSettingsChange;

export type OnChangeCallback = (params: SettingsChange) => void;

class Settings {
  get isDebug(): number {
    return parseInt(localStorage.getItem(SettingStorageKey.IsDebug) || "0");
  }
  set isDebug(v: number) {
    localStorage.setItem(SettingStorageKey.IsDebug, v.toString());
    LocalLogger.setLevel(v !== 0 ? LocalLogger.LogLevel.Debug : LocalLogger.LogLevel.Error);
    ipcUploadManager.updateConfig({
      isDebug: v !== 0,
    });
    ipcDownloadManager.updateConfig({
      isDebug: v !== 0,
    });
    this.trigger({
      key: SettingKey.IsDebug,
      value: v,
    });
  }

  // autoUpgrade
  get autoUpgrade(): number {
    return parseInt(localStorage.getItem(SettingStorageKey.AutoUpgrade) || "0");
  }
  set autoUpgrade(v: number) {
    localStorage.setItem(SettingStorageKey.AutoUpgrade, v.toString());
    this.trigger({
      key: SettingKey.AutoUpgrade,
      value: v,
    });
  }

  // resumeUpload
  get resumeUpload(): number {
    return parseInt(localStorage.getItem(SettingStorageKey.ResumeUpload) || "0");
  }
  set resumeUpload(v: number) {
    localStorage.setItem(SettingStorageKey.ResumeUpload, v.toString());
    ipcUploadManager.updateConfig({
      resumable: v !== 0,
    });
    this.trigger({
      key: SettingKey.ResumeUpload,
      value: v,
    });
  }

  // maxUploadConcurrency
  get maxUploadConcurrency(): number {
    return parseInt(localStorage.getItem(SettingStorageKey.MaxUploadConcurrency) || "1");
  }
  set maxUploadConcurrency(v: number) {
    localStorage.setItem(SettingStorageKey.MaxUploadConcurrency, v.toString());
    ipcUploadManager.updateConfig({
      maxConcurrency: v,
    });
    this.trigger({
      key: SettingKey.MaxUploadConcurrency,
      value: v,
    });
  }

  // multipartUploadSize
  get multipartUploadSize(): number {
    return parseInt(localStorage.getItem(SettingStorageKey.MultipartUploadSize) || "8");
  }
  set multipartUploadSize(v: number) {
    if (v >= 1 && v <= 1024) {
      localStorage.setItem(SettingStorageKey.MultipartUploadSize, v.toString());
      ipcUploadManager.updateConfig({
        multipartSize: v * ByteSize.MB,
      });
    }
    this.trigger({
      key: SettingKey.MultipartUploadSize,
      value: v,
    });
  }

  // multipartUploadThreshold
  get multipartUploadThreshold(): number {
    return parseInt(localStorage.getItem(SettingStorageKey.MultipartUploadThreshold) || "100");
  }
  set multipartUploadThreshold(v: number) {
    localStorage.setItem(SettingStorageKey.MultipartUploadThreshold, v.toString());
    ipcUploadManager.updateConfig({
      multipartThreshold: v * ByteSize.MB,
    });
    this.trigger({
      key: SettingKey.MultipartUploadThreshold,
      value: v,
    });
  }

  // uploadSpeedLimitEnabled
  get uploadSpeedLimitEnabled(): number {
    return parseInt(localStorage.getItem(SettingStorageKey.UploadSpeedLimitEnabled) || "0");
  }
  set uploadSpeedLimitEnabled(v: number) {
    localStorage.setItem(SettingStorageKey.UploadSpeedLimitEnabled, v.toString());
    if (v === 0) {
      ipcUploadManager.updateConfig({
        speedLimit: 0,
      });
    } else {
      ipcUploadManager.updateConfig({
        speedLimit: this.uploadSpeedLimitKbPerSec * ByteSize.KB,
      });
    }
    this.trigger({
      key: SettingKey.UploadSpeedLimitEnabled,
      value: v,
    });
  }

  // uploadSpeedLimitKbPerSec
  get uploadSpeedLimitKbPerSec(): number {
    return parseInt(localStorage.getItem(SettingStorageKey.UploadSpeedLimit) || "1024");
  }

  set uploadSpeedLimitKbPerSec(v: number) {
    localStorage.setItem(SettingStorageKey.UploadSpeedLimit, v.toString());
    if (this.uploadSpeedLimitEnabled) {
      ipcUploadManager.updateConfig({
        speedLimit: v * ByteSize.KB,
      });
    }
    this.trigger({
      key: SettingKey.UploadSpeedLimitKbPerSec,
      value: v,
    });
  }

  // resumeDownload
  get resumeDownload(): number {
    return parseInt(localStorage.getItem(SettingStorageKey.ResumeDownload) || "0");
  }
  set resumeDownload(v: number) {
    localStorage.setItem(SettingStorageKey.ResumeDownload, v.toString());
    ipcDownloadManager.updateConfig({
      resumable: v !== 0,
    });
    this.trigger({
      key: SettingKey.ResumeDownload,
      value: v,
    });
  }

  // maxDownloadConcurrency
  get maxDownloadConcurrency(): number {
    return parseInt(localStorage.getItem(SettingStorageKey.MaxDownloadConcurrency) || "1");
  }
  set maxDownloadConcurrency(v: number) {
    localStorage.setItem(SettingStorageKey.MaxDownloadConcurrency, v.toString());
    ipcDownloadManager.updateConfig({
      maxConcurrency: v,
    });
    this.trigger({
      key: SettingKey.MaxDownloadConcurrency,
      value: v,
    });
  }

  // multipartDownloadSize
  get multipartDownloadSize(): number {
    return parseInt(localStorage.getItem(SettingStorageKey.MultipartDownloadSize) || "8");
  }
  set multipartDownloadSize(v: number) {
    localStorage.setItem(SettingStorageKey.MultipartDownloadSize, v.toString());
    ipcDownloadManager.updateConfig({
      multipartSize: v * ByteSize.MB,
    });
    this.trigger({
      key: SettingKey.MultipartDownloadSize,
      value: v,
    });
  }

  // multipartDownloadThreshold
  get multipartDownloadThreshold(): number {
    return parseInt(localStorage.getItem(SettingStorageKey.MultipartDownloadThreshold) || "100");
  }
  set multipartDownloadThreshold(v: number) {
    localStorage.setItem(SettingStorageKey.MultipartDownloadThreshold, v.toString());
    ipcDownloadManager.updateConfig({
      multipartThreshold: v * ByteSize.MB,
    });
    this.trigger({
      key: SettingKey.MultipartDownloadThreshold,
      value: v,
    });
  }

  // downloadSpeedLimitEnabled
  get downloadSpeedLimitEnabled(): number {
    return parseInt(localStorage.getItem(SettingStorageKey.DownloadSpeedLimitEnabled) || "0");
  }
  set downloadSpeedLimitEnabled(v: number) {
    localStorage.setItem(SettingStorageKey.DownloadSpeedLimitEnabled, v.toString());
    if (v === 0) {
      ipcDownloadManager.updateConfig({
        speedLimit: 0,
      });
    } else {
      ipcDownloadManager.updateConfig({
        speedLimit: this.downloadSpeedLimitKbPerSec * ByteSize.KB,
      });
    }
    this.trigger({
      key: SettingKey.DownloadSpeedLimitEnabled,
      value: v,
    });
  }

  // downloadSpeedLimitKbPerSec
  get downloadSpeedLimitKbPerSec(): number {
    return parseInt(localStorage.getItem(SettingStorageKey.DownloadSpeedLimit) || "1024");
  }
  set downloadSpeedLimitKbPerSec(v: number) {
    localStorage.setItem(SettingStorageKey.DownloadSpeedLimit, v.toString());
    if (this.downloadSpeedLimitEnabled) {
      ipcDownloadManager.updateConfig({
        speedLimit: v * ByteSize.KB,
      });
    }
    this.trigger({
      key: SettingKey.DownloadSpeedLimitKbPerSec,
      value: v,
    });
  }

  // skipEmptyDirectoryUpload
  get skipEmptyDirectoryUpload(): boolean {
    return localStorage.getItem(SettingStorageKey.SkipEmptyDirectoryUpload) === "true";
  }
  set skipEmptyDirectoryUpload(v: boolean) {
    localStorage.setItem(SettingStorageKey.SkipEmptyDirectoryUpload, v.toString());
    ipcUploadManager.updateConfig({
      isSkipEmptyDirectory: v,
    });
    this.trigger({
      key: SettingKey.SkipEmptyDirectoryUpload,
      value: v,
    });
  }

  // overwriteDownload
  get overwriteDownload(): boolean {
    return localStorage.getItem(SettingStorageKey.OverwriteDownload) === "true";
  }
  set overwriteDownload(v: boolean) {
    localStorage.setItem(SettingStorageKey.OverwriteDownload, v.toString());
    ipcDownloadManager.updateConfig({
      isOverwrite: v,
    });
    this.trigger({
      key: SettingKey.OverwriteDownload,
      value: v,
    });
  }

  // externalPathEnabled
  get externalPathEnabled(): number {
    return parseInt(localStorage.getItem(SettingStorageKey.ExternalPathEnabled) || "0");
  }
  set externalPathEnabled(v: number) {
    localStorage.setItem(SettingStorageKey.ExternalPathEnabled, v.toString());
    this.trigger({
      key: SettingKey.ExternalPathEnabled,
      value: v,
    });
  }

  // stepByStepLoadingFiles
  get stepByStepLoadingFiles(): number {
    return parseInt(localStorage.getItem(SettingStorageKey.StepByStepLoadingFiles) || "0");
  }
  set stepByStepLoadingFiles(v: number) {
    localStorage.setItem(SettingStorageKey.StepByStepLoadingFiles, v.toString());
    this.trigger({
      key: SettingKey.StepByStepLoadingFiles,
      value: v,
    });
  }

  // filesLoadingSize
  get filesLoadingSize(): number {
    return parseInt(localStorage.getItem(SettingStorageKey.FilesLoadingSize) || "500");
  }
  set filesLoadingSize(v: number) {
    localStorage.setItem(SettingStorageKey.FilesLoadingSize, v.toString());
    this.trigger({
      key: SettingKey.FilesLoadingSize,
      value: v,
    });
  }

  // historiesLength
  get historiesLength(): number {
    return parseInt(localStorage.getItem(SettingStorageKey.HistoriesLength) || "100");
  }
  set historiesLength(v: number) {
    localStorage.setItem(SettingStorageKey.HistoriesLength, v.toString());
    this.trigger({
      key: SettingKey.HistoriesLength,
      value: v,
    });
  }

  // language
  get language(): LangName {
    return localStorage.getItem(SettingStorageKey.Language)?.replace("-", "_") as LangName ?? LangName.ZH_CN;
  }
  set language(v: LangName) {
    localStorage.setItem(SettingStorageKey.Language, v.replace("_", "-"));
    this.trigger({
      key: SettingKey.Language,
      value: v,
    });
  }

  private changeListener: OnChangeCallback[] = [];

  onChange(listener: OnChangeCallback) {
    this.changeListener.push(listener);
  }

  offChange(listener: OnChangeCallback) {
    const targetIndex = this.changeListener.indexOf(listener);
    if (targetIndex < 0) {
      return;
    }
    this.changeListener.splice(targetIndex, 1);
  }

  private trigger(changes: SettingsChange) {
    this.changeListener.forEach(fn => fn(changes));
  }
}


export default new Settings();
