// this file cached download state to keep job can run background.
import {downloadLatestVersion, fetchUpdate} from "@renderer/modules/update-app";
import {useSyncExternalStore} from "react";

let downloadPromise: ReturnType<typeof downloadLatestVersion> | undefined;

export enum ProgressStatus {
  Standby = "standby",
  Running = "running",
  Paused = "paused",
  Success = "success",
  Failed = "Failed",
}

interface DownloadUpdateStoreData {
  progress?: {
    loaded: number,
    total: number,
  },
  status: ProgressStatus,
  error?: Error,
  filePath?: string,
}

const DEFAULT_DOWNLOAD_UPDATE_STORE_DATA: DownloadUpdateStoreData = {
  progress: undefined,
  status: ProgressStatus.Standby,
  error: undefined,
  filePath: undefined,
}

const updateDownloaderStore = {
  data: {
    ...DEFAULT_DOWNLOAD_UPDATE_STORE_DATA,
  },
  listeners: new Set<() => void>(),
  subscribe(l: () => void) {
    updateDownloaderStore.listeners.add(l);
    return () => updateDownloaderStore.listeners.delete(l);
  },
  getSnapshot() {
    return updateDownloaderStore.data;
  },
  dispatch(data: Partial<DownloadUpdateStoreData>) {
    updateDownloaderStore.data = {
      ...updateDownloaderStore.data,
      ...data,
    };
    updateDownloaderStore.listeners.forEach(l => l());
  }
};

const handleDownloadProgress = (loaded: number, total: number): boolean => {
  updateDownloaderStore.dispatch({
    progress: {
      total,
      loaded,
    },
  });
  return updateDownloaderStore.data.status === ProgressStatus.Running;
};

const startDownload = (toDirectory?: string) => {
  if (downloadPromise) {
    return downloadPromise;
  }
  updateDownloaderStore.dispatch({
    ...DEFAULT_DOWNLOAD_UPDATE_STORE_DATA,
    status: ProgressStatus.Running,
  });
  downloadPromise = downloadLatestVersion({
    toDirectory,
    onProgress: handleDownloadProgress,
  });
  downloadPromise
    .then(filePath => {
      updateDownloaderStore.dispatch({
        filePath,
        status: ProgressStatus.Success,
      });
    })
    .catch(err => {
      updateDownloaderStore.dispatch({
        error: err,
        status: ProgressStatus.Failed,
      });
    })
    .finally(() => {
      downloadPromise = undefined;
    });
  return downloadPromise;
};

const pauseDownload = () => {
  updateDownloaderStore.dispatch({
    status: ProgressStatus.Paused,
  });
}

const useDownloadUpdate = () => {
  const downloadUpdateState = useSyncExternalStore(
    updateDownloaderStore.subscribe,
    updateDownloaderStore.getSnapshot,
  );

  return {
    state: downloadUpdateState,
    fetchUpdate,
    startDownload,
    pauseDownload,
  };
};

export default useDownloadUpdate;
