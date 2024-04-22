import React, {useEffect, useSyncExternalStore} from "react";
import {toast} from "react-hot-toast";
import {Button, ProgressBar} from "react-bootstrap";
import {shell} from "electron";

import {useI18n} from "@renderer/modules/i18n";
import {appPreferences} from "@renderer/modules/user-config-store";

import useDownloadUpdate, {ProgressStatus} from "./use-download-update";

const DownloadButton: React.FC<{
  downloadedFilePath: string | undefined,
  progressStatus: ProgressStatus,
  onClickStart: () => void,
  onClickPause: () => void,
}> = ({
  downloadedFilePath,
  progressStatus,
  onClickStart,
  onClickPause,
}) => {
  const {translate} = useI18n();

  let variant: string;
  let iconClassName: string;
  let handleClick: () => void = onClickStart;
  let content: string;

  switch (progressStatus) {
    case ProgressStatus.Standby:
      variant = "success";
      iconClassName = "bi bi-download me-1";
      content = translate("modals.about.updateApp.operationButton.start");
      break;

    case ProgressStatus.Paused:
      variant = "info";
      iconClassName = "bi bi-download me-1";
      content = translate("modals.about.updateApp.operationButton.resume");
      break;

    case ProgressStatus.Running:
      variant = "warning";
      iconClassName = "bi bi-pause me-1";
      handleClick = onClickPause;
      content = translate("modals.about.updateApp.operationButton.pause");
      break;

    case ProgressStatus.Success:
      variant = "success";
      iconClassName = "bi bi-file-earmark-zip-fill me-1";
      handleClick = () => {
        if (!downloadedFilePath) {
          return;
        }
        shell.showItemInFolder(downloadedFilePath);
      };
      content = translate("modals.about.updateApp.operationButton.showItemInDir");
      break;

    case ProgressStatus.Failed:
      variant = "info";
      iconClassName = "bi bi-arrow-repeat me-1";
      handleClick = onClickStart;
      content = translate("common.retry");
      break;
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

const DownloadProgress: React.FC<{
  progressStatus: ProgressStatus,
  loaded: number,
  total: number,
  errorMessage?: string,
}> = ({
  progressStatus,
  loaded,
  total,
  errorMessage,
}) => {
  const {translate} = useI18n();

  if (progressStatus === ProgressStatus.Standby) {
    return null;
  }

  let finishedPercent;
  if (loaded && total) {
    finishedPercent = loaded * 100 / total;
  }
  finishedPercent = finishedPercent || 0;

  let variant;
  let statusText;
  let isAnimated = false;

  switch (progressStatus) {
    case ProgressStatus.Running:
      variant = "success";
      statusText = translate("common.downloading");
      isAnimated = true;
      break;
    case ProgressStatus.Paused:
      variant = "warning";
      statusText = translate("common.paused");
      break;
    case ProgressStatus.Success:
      variant = "success";
      statusText = translate("common.downloaded");
      break;
    case ProgressStatus.Failed:
      variant = "danger";
      statusText = translate("common.failed");
      break;
  }

  return (
    <div>
      <small className={`text-${variant}`}>{statusText}</small>
      <div>
        <ProgressBar
          animated={isAnimated}
          striped
          variant={variant}
          now={finishedPercent}
        />
        <div className="d-flex align-items-center">
          <div>{`${finishedPercent.toFixed(2)}%`}</div>
        </div>
      </div>
      {
        errorMessage &&
        <small className="text-danger">{errorMessage}</small>
      }
    </div>
  );
}

interface DownloadUpgradeProps {
  version: string,
}

const DownloadUpdate: React.FC<DownloadUpgradeProps> = ({
  version,
}) => {
  const {translate} = useI18n();

  const {
    state: downloadState,
    fetchUpdate,
    startDownload,
    pauseDownload,
  } = useDownloadUpdate();

  // event handlers
  const handleStart = () => {
    if (downloadState.status === ProgressStatus.Running) {
      return;
    }
    startDownload()
      .catch((err) => {
        toast.error(err.toString());
      });
  };

  const handleManuelDownload = async () => {
    const {downloadPageUrl} = await fetchUpdate();
    await shell.openExternal(downloadPageUrl);
  }

  // auto upgrade
  const {
    data: appPreferencesData,
  } = useSyncExternalStore(
    appPreferences.store.subscribe,
    appPreferences.store.getSnapshot,
  );
  useEffect(() => {
    if (downloadState.status === ProgressStatus.Standby && appPreferencesData.autoUpdateAppEnabled) {
      handleStart();
    }
  }, [appPreferencesData.autoUpdateAppEnabled]);

  // render
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center">
        <div className="me-auto">
          {translate("modals.about.updateApp.foundLatest")}
          <span className="text-primary ms-1">v{version}</span>
        </div>
        {
          downloadState.status === ProgressStatus.Failed &&
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
          downloadedFilePath={downloadState.filePath}
          progressStatus={downloadState.status}
          onClickStart={handleStart}
          onClickPause={pauseDownload}
        />
      </div>
      <DownloadProgress
        progressStatus={downloadState.status}
        loaded={downloadState.progress?.loaded ?? 0}
        total={downloadState.progress?.total ?? 0}
        errorMessage={downloadState.error?.toString()}
      />
    </div>
  );
};

export default DownloadUpdate;
