// this file cached download state to keep job can run background.
import {downloadLatestVersion, fetchUpdate} from "@renderer/modules/update-app";
import {BatchProgressState, BatchTaskStatus} from "@renderer/components/batch-progress";

let downloadPromise: ReturnType<typeof downloadLatestVersion> | undefined;
let handleDownloadProgress: ((loaded: number, total: number) => boolean) | undefined;
let cachedError: Error | undefined;
let cachedProgressState: BatchProgressState | undefined;
let cachedFilePath: string | undefined;

const useDownloadUpdate = () => {
  const _downloadLatestVersion: typeof downloadLatestVersion = ({
    toDirectory,
    onProgress,
  }) => {
    handleDownloadProgress = onProgress;
    if (downloadPromise) {
      return downloadPromise;
    }
    cachedFilePath = undefined;
    downloadPromise = downloadLatestVersion({
      toDirectory,
      onProgress: (...args) => handleDownloadProgress?.(...args) ?? true,
    });
    downloadPromise
      .then(filePath => cachedFilePath = filePath)
      .catch(err => {
        cachedError = err;
        if (cachedProgressState) {
          cachedProgressState.errored = cachedProgressState.finished;
          cachedProgressState.finished = 0;
        }
      })
      .finally(() => {
        if (cachedProgressState) {
          cachedProgressState.status = BatchTaskStatus.Ended;
        }
        downloadPromise = undefined;
        handleDownloadProgress = undefined;
      });
    return downloadPromise;
  };

  const background = (progressState: BatchProgressState, error?: Error) => {
    cachedProgressState = progressState;
    cachedError = error;
    handleDownloadProgress = (loaded, total) => {
      if (cachedProgressState) {
        cachedProgressState.finished = loaded;
        cachedProgressState.total = total;
      }
      return true;
    };
  };

  return {
    cachedError,
    cachedFilePath,
    cachedProgressState,
    fetchUpdate,
    downloadLatestVersion: _downloadLatestVersion,
    background,
  };
};

export default useDownloadUpdate;
