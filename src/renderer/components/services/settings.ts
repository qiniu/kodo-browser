import ByteSize from "@common/const/byte-size";
import ipcUploadManager from "@/components/services/ipc-upload-manager";
import ipcDownloadManager from "@/components/services/ipc-download-manager";

export enum SettingKey {
  IsDebug = "isDebug",
  AutoUpgrade = "autoUpgrade",

  // upload
  ResumeUpload = "resumeUpload",
  MaxUploadConcurrency = "maxUploadConcurrency",
  MultipartUploadSize = "multipartUploadSize",
  MultipartUploadThreshold = "multipartUploadThreshold",
  UploadSpeedLimitEnabled = "uploadSpeedLimitEnabled",
  UploadSpeedLimit = "uploadSpeedLimit",

  // download
  ResumeDownload = "resumeDownload",
  MaxDownloadConcurrency = "maxDownloadConcurrency",
  MultipartDownloadSize = "multipartDownloadSize",
  MultipartDownloadThreshold = "multipartDownloadThreshold",
  DownloadSpeedLimitEnabled = "downloadSpeedLimitEnabled",
  DownloadSpeedLimit = "downloadSpeedLimit",

  // others
  ExternalPathEnabled = "externalPathEnabled",
  StepByStepLoadingFiles = "stepByStepLoadingFiles",
  FilesLoadingSize = "filesLoadingSize",
  HistoriesLength = "navHistoriesLength",
}

class Settings {
  get isDebug(): number {
    return parseInt(localStorage.getItem(SettingKey.IsDebug) || "0");
  }
  set isDebug(v: number) {
    localStorage.setItem(SettingKey.IsDebug, v.toString());
    ipcUploadManager.updateConfig({
      isDebug: v !== 0,
    });
    ipcDownloadManager.updateConfig({
      isDebug: v !== 0,
    })
  }

  // autoUpgrade
  get autoUpgrade(): number {
    return parseInt(localStorage.getItem(SettingKey.AutoUpgrade) || "0");
  }
  set autoUpgrade(v: number) {
    localStorage.setItem(SettingKey.AutoUpgrade, v.toString());
  }

  // resumeUpload
  get resumeUpload(): number {
    return parseInt(localStorage.getItem(SettingKey.ResumeUpload) || "0");
  }
  set resumeUpload(v: number) {
    localStorage.setItem(SettingKey.ResumeUpload, v.toString());
    ipcUploadManager.updateConfig({
      resumable: v !== 0,
    });
  }

  // maxUploadConcurrency
  get maxUploadConcurrency(): number {
    return parseInt(localStorage.getItem(SettingKey.MaxUploadConcurrency) || "1");
  }
  set maxUploadConcurrency(v: number) {
    localStorage.setItem(SettingKey.MaxUploadConcurrency, v.toString());
    ipcUploadManager.updateConfig({
      maxConcurrency: v,
    });
  }

  // multipartUploadSize
  get multipartUploadSize(): number {
    return parseInt(localStorage.getItem(SettingKey.MultipartUploadSize) || "8");
  }
  set multipartUploadSize(v: number) {
    if (v >= 1 && v <= 1024) {
      localStorage.setItem(SettingKey.MultipartUploadSize, v.toString());
      ipcUploadManager.updateConfig({
        multipartSize: v * ByteSize.MB,
      });
    }
  }

  // multipartUploadThreshold
  get multipartUploadThreshold(): number {
    return parseInt(localStorage.getItem(SettingKey.MultipartUploadThreshold) || "100");
  }
  set multipartUploadThreshold(v: number) {
    localStorage.setItem(SettingKey.MultipartUploadThreshold, v.toString());
    ipcUploadManager.updateConfig({
      multipartThreshold: v * ByteSize.MB,
    });
  }

  // uploadSpeedLimitEnabled
  get uploadSpeedLimitEnabled(): number {
    return parseInt(localStorage.getItem(SettingKey.UploadSpeedLimitEnabled) || "0");
  }
  set uploadSpeedLimitEnabled(v: number) {
    localStorage.setItem(SettingKey.UploadSpeedLimitEnabled, v.toString());
    if (v === 0) {
      ipcUploadManager.updateConfig({
        speedLimit: 0,
      });
    } else {
      ipcUploadManager.updateConfig({
        speedLimit: this.uploadSpeedLimitKBperSec * ByteSize.KB,
      });
    }
  }

  // uploadSpeedLimitKBperSec
  get uploadSpeedLimitKBperSec() {
    return parseInt(localStorage.getItem(SettingKey.UploadSpeedLimit) || "1024");
  }
  set uploadSpeedLimitKBperSec (v) {
    localStorage.setItem(SettingKey.UploadSpeedLimit, v.toString());
    if (this.uploadSpeedLimitEnabled) {
      ipcUploadManager.updateConfig({
        speedLimit: v * ByteSize.KB,
      });
    }
  }

// downloadSpeedLimitKBperSec
  get downloadSpeedLimitKBperSec(): number {
    return parseInt(localStorage.getItem(SettingKey.DownloadSpeedLimit) || "1024");
  }
  set downloadSpeedLimitKBperSec(v: number) {
    localStorage.setItem(SettingKey.DownloadSpeedLimit, v.toString());
    if (this.downloadSpeedLimitEnabled){
      ipcDownloadManager.updateConfig({
        speedLimit: v * ByteSize.KB,
      });
    }
  }

  // resumeDownload
  get resumeDownload(): number {
    return parseInt(localStorage.getItem(SettingKey.ResumeDownload) || "0");
  }
  set resumeDownload(v: number) {
    localStorage.setItem(SettingKey.ResumeDownload, v.toString());
    ipcDownloadManager.updateConfig({
      resumable: v !== 0,
    });
  }

  // maxDownloadConcurrency
  get maxDownloadConcurrency(): number {
    return parseInt(localStorage.getItem(SettingKey.MaxDownloadConcurrency) || "1");
  }
  set maxDownloadConcurrency(v: number) {
    localStorage.setItem(SettingKey.MaxDownloadConcurrency, v.toString());
    ipcDownloadManager.updateConfig({
      maxConcurrency: v,
    });
  }

  // multipartDownloadSize
  get multipartDownloadSize(): number {
    return parseInt(localStorage.getItem(SettingKey.MultipartDownloadSize) || "8");
  }
  set multipartDownloadSize(v: number) {
    localStorage.setItem(SettingKey.MultipartDownloadSize, v.toString());
    ipcDownloadManager.updateConfig({
      multipartSize: v * ByteSize.MB,
    });
  }

  // multipartDownloadThreshold
  get multipartDownloadThreshold(): number {
    return parseInt(localStorage.getItem(SettingKey.MultipartDownloadThreshold) || "100");
  }
  set multipartDownloadThreshold(v: number) {
    localStorage.setItem(SettingKey.MultipartDownloadThreshold, v.toString());
    ipcDownloadManager.updateConfig({
      multipartThreshold: v * ByteSize.MB,
    });
  }

  // downloadSpeedLimitEnabled
  get downloadSpeedLimitEnabled(): number {
    return parseInt(localStorage.getItem(SettingKey.DownloadSpeedLimitEnabled) || "0");
  }
  set downloadSpeedLimitEnabled(v: number) {
    localStorage.setItem(SettingKey.DownloadSpeedLimitEnabled, v.toString());
    if (v === 0) {
      ipcDownloadManager.updateConfig({
        speedLimit: 0,
      });
    } else {
      ipcDownloadManager.updateConfig({
        speedLimit: this.downloadSpeedLimitKBperSec * ByteSize.KB,
      });
    }
  }

  // externalPathEnabled
  get externalPathEnabled(): number {
    return parseInt(localStorage.getItem(SettingKey.ExternalPathEnabled) || "0");
  }
  set externalPathEnabled(v: number) {
    localStorage.setItem(SettingKey.ExternalPathEnabled, v.toString());
  }

  // stepByStepLoadingFiles
  get stepByStepLoadingFiles(): number {
    return parseInt(localStorage.getItem(SettingKey.StepByStepLoadingFiles) || "0");
  }
  set stepByStepLoadingFiles(v: number) {
    localStorage.setItem(SettingKey.StepByStepLoadingFiles, v.toString());
  }

  // filesLoadingSize
  get filesLoadingSize(): number {
    return parseInt(localStorage.getItem(SettingKey.FilesLoadingSize) || "500");
  }
  set filesLoadingSize(v: number) {
    localStorage.setItem(SettingKey.FilesLoadingSize, v.toString());
  }

  // historiesLength
  get historiesLength(): number {
    return parseInt(localStorage.getItem(SettingKey.HistoriesLength) || "100");
  }
  set historiesLength(v: number) {
    localStorage.setItem(SettingKey.HistoriesLength, v.toString());
  }

}


export default new Settings();
