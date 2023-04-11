// this file cached download state to keep job can run background.
import {downloadLatestVersion} from "@renderer/modules/update-app";
import {BatchProgressState} from "@renderer/components/batch-progress";

let downloadPromise: ReturnType<typeof downloadLatestVersion> | undefined;
let handleDownloadProgress: ((loaded: number, total: number) => boolean) | undefined;
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
      .finally(() => {
        downloadPromise = undefined;
        handleDownloadProgress = undefined;
      });
    return downloadPromise;
  };

  const background = (progressState: BatchProgressState) => {
    cachedProgressState = progressState;
    handleDownloadProgress = () => true;
  };

  return {
    cachedFilePath,
    cachedProgressState,
    downloadLatestVersion: _downloadLatestVersion,
    background,
  };
};

export default useDownloadUpdate;
