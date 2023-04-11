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
  downloadedFilePath: string | undefined,
  progressStatus: BatchTaskStatus,
  onClickStart: () => void,
  onClickPause: () => void,
}> = ({
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
  const {
    cachedFilePath,
    cachedProgressState,
    downloadLatestVersion,
    background,
  } = useDownloadUpdate();
  const [downloadedFilePath, setDownloadFilePath] = useState(cachedFilePath);

  // download
  const handleProgress = (loaded: number, total: number): boolean => {
    setBatchProgressState({
      total: total,
      finished: loaded,
    });
    return isGoOn.current;
  }

  const handleStart = () => {
    if (batchProgressState.status === BatchTaskStatus.Running) {
      return;
    }
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
      });
  };

  const handlePause = () => {
    isGoOn.current = false;
    setBatchProgressState({
      status: BatchTaskStatus.Paused,
    });
  };

  // store and restore state
  useMount(() => {
    if (cachedProgressState) {
      setBatchProgressState(cachedProgressState);
      if (cachedProgressState.status !== BatchTaskStatus.Standby) {
        handleStart();
        return;
      }
    }
    if (Settings.autoUpgrade) {
      handleStart();
    }
  });
  useUnmount(() => {
    background(batchProgressState);
  });

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center">
        <div>{translate("modals.about.updateApp.foundLatest")} <span className="text-primary">v{version}</span></div>
        <DownloadButton
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
              <BatchProgress
                status={batchProgressState.status}
                total={batchProgressState.total}
                finished={batchProgressState.finished}
                errored={batchProgressState.errored}
                isPercent
              />
            </>
        }
      </div>
    </div>
  );
};

export default DownloadUpdate;
