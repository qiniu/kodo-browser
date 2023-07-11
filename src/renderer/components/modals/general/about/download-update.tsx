import React, {useRef, useState} from "react";
import {Button} from "react-bootstrap";
import {shell} from "electron";

import {BatchProgress, BatchTaskStatus, useBatchProgress} from "@renderer/components/batch-progress";

import useMount from "@renderer/modules/hooks/use-mount";
import useUnmount from "@renderer/modules/hooks/use-unmount";
import {useI18n} from "@renderer/modules/i18n";
import Settings from "@renderer/modules/settings";

import useDownloadUpdate from "./use-download-update";

const DownloadButton: React.FC<{
  downloadError?: Error,
  downloadedFilePath: string | undefined,
  progressStatus: BatchTaskStatus,
  onClickStart: () => void,
  onClickPause: () => void,
}> = ({
  downloadError,
  downloadedFilePath,
  progressStatus,
  onClickStart,
  onClickPause,
}) => {
  const {translate} = useI18n();

  let variant = "success"
  let iconClassName = "bi bi-download me-1";
  let handleClick = onClickStart;
  let content = translate("modals.about.updateApp.operationButton.start");

  if (progressStatus === BatchTaskStatus.Paused) {
    variant = "info";
    content = translate("modals.about.updateApp.operationButton.resume");
  }

  if (progressStatus === BatchTaskStatus.Running) {
    variant = "warning";
    iconClassName = "bi bi-pause me-1";
    handleClick = onClickPause;
    content = translate("modals.about.updateApp.operationButton.pause");
  }

  if (progressStatus === BatchTaskStatus.Ended) {
    iconClassName = "bi bi-file-earmark-zip-fill me-1";
    handleClick = () => {
      if (!downloadedFilePath) {
        return;
      }
      shell.showItemInFolder(downloadedFilePath);
    };
    content = translate("modals.about.updateApp.operationButton.showItemInDir");
  }

  if (downloadError) {
    variant = "info";
    iconClassName = "bi bi-arrow-repeat me-1";
    handleClick = onClickStart;
    content = translate("common.retry")
  }

  return (
    <Button
      size="sm"
      variant={variant}
      onClick={handleClick}
      className="text-white"
    >
      <i className={iconClassName}/>
      {content}
    </Button>
  );
};

interface DownloadUpgradeProps {
  version: string,
}

const DownloadUpdate: React.FC<DownloadUpgradeProps> = ({
  version,
}) => {
  const {translate} = useI18n();

  const isGoOn = useRef(true);
  const [batchProgressState, setBatchProgressState] = useBatchProgress();
  const [downloadError, setDownloadError] = useState<Error>()
  const {
    cachedError,
    cachedFilePath,
    cachedProgressState,
    fetchUpdate,
    downloadLatestVersion,
    background,
  } = useDownloadUpdate();
  const [downloadedFilePath, setDownloadFilePath] = useState(cachedFilePath);

  // download
  const handleProgress = (loaded: number, total: number): boolean => {
    setBatchProgressState({
      total: total,
      finished: loaded,
      errored: 0,
    });
    return isGoOn.current;
  }

  const handleError = (err: Error) => {
    if (err.toString().includes("aborted")) {
      return;
    }
    setDownloadError(err);
    setBatchProgressState(s => ({
      status: BatchTaskStatus.Ended,
      finished: 0,
      errored: s.finished,
    }));
  };

  const handleStart = () => {
    if (batchProgressState.status === BatchTaskStatus.Running) {
      return;
    }
    setDownloadError(undefined);
    setBatchProgressState({
      status: BatchTaskStatus.Running,
    });
    isGoOn.current = true;
    downloadLatestVersion({
      onProgress: handleProgress,
    })
      .then(filePath => {
        setBatchProgressState({
          status: BatchTaskStatus.Ended,
        });
        setDownloadFilePath(filePath);
      })
      .catch(handleError);
  };

  const handlePause = () => {
    isGoOn.current = false;
    setBatchProgressState({
      status: BatchTaskStatus.Paused,
    });
  };

  const handleManuelDownload = async () => {
    const {downloadPageUrl} = await fetchUpdate();
    await shell.openExternal(downloadPageUrl);
  }

  // store and restore state
  useMount(() => {
    if (cachedProgressState) {
      setBatchProgressState(cachedProgressState);
      if (cachedProgressState.status === BatchTaskStatus.Running) {
        handleStart();
        return;
      }
    }
    if (cachedError) {
      setDownloadError(cachedError);
    }
    if (Settings.autoUpgrade) {
      handleStart();
    }
  });
  useUnmount(() => {
    background(batchProgressState, downloadError);
  });

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center">
        <div className="me-auto">
          {translate("modals.about.updateApp.foundLatest")}
          <span className="text-primary ms-1">v{version}</span>
        </div>
        {
          downloadError &&
          <Button
            className="me-1"
            size="sm"
            variant="link"
            onClick={handleManuelDownload}
          >
            {translate("modals.about.updateApp.downloadManually")}
            <i className="bi bi-box-arrow-up-right ms-1"/>
          </Button>
        }
        <DownloadButton
          downloadError={downloadError}
          downloadedFilePath={downloadedFilePath}
          progressStatus={batchProgressState.status}
          onClickStart={handleStart}
          onClickPause={handlePause}
        />
      </div>
      <div>
        {
          batchProgressState.status === BatchTaskStatus.Standby
            ? null
            : <>
              {
                batchProgressState.status === BatchTaskStatus.Paused &&
                <small>{translate("common.paused")}</small>
              }
              {
                batchProgressState.status === BatchTaskStatus.Running &&
                <small className="text-success">{translate("common.downloading")}</small>
              }
              {
                downloadedFilePath &&
                <small className="text-success">{translate("common.downloaded")}</small>
              }
              {
                downloadError &&
                <small className="text-danger">{translate("common.failed")}</small>
              }
              <BatchProgress
                status={batchProgressState.status}
                total={batchProgressState.total}
                finished={batchProgressState.finished}
                errored={batchProgressState.errored}
                isPercent
              />
              {
                downloadError &&
                <small className="text-danger">{downloadError.toString()}</small>
              }
            </>
        }
      </div>
    </div>
  );
};

export default DownloadUpdate;
