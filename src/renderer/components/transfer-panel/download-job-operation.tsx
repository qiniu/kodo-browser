import React, {useState} from "react";
import {Button} from "react-bootstrap";

import {Status} from "@common/models/job/types";
import {useI18n} from "@renderer/modules/i18n";
import ipcDownloadManager from "@renderer/modules/electron-ipc-manages/ipc-download-manager";

import TooltipButton from "@renderer/components/tooltip-button";

interface DownloadJobOperationProps {
  jobId: string,
  status: Status,
  resumable?: boolean,
}

const DownloadJobOperation: React.FC<DownloadJobOperationProps> = ({
  jobId,
  status,
  resumable,
}) => {
  const {translate} = useI18n();
  const [isShowRemoveConfirm, setIsShowRemoveConfirm] = useState<boolean>(false);

  if (isShowRemoveConfirm) {
    return (
      <>
        <Button
          size="sm"
          variant="lite-danger"
          onClick={() => {
            ipcDownloadManager.removeJob({jobId});
            // need to reset to false, because
            // the state will be member by react window for reusing
            setIsShowRemoveConfirm(false);
          }}
        >
          {translate("transfer.jobItem.removeConfirmOk")}
        </Button>
        <Button
          size="sm"
          variant="lite-secondary"
          onClick={() => setIsShowRemoveConfirm(false)}
        >
          {translate("common.cancel")}
        </Button>
      </>
    )
  }

  return (
    <>
      {
        resumable && Status.Running === status &&
        <TooltipButton
          variant="warning"
          size="sm"
          iconClassName="bi bi-pause"
          tooltipPlacement="left"
          tooltipContent={translate("transfer.jobItem.pauseButton")}
          onClick={() => ipcDownloadManager.stopJob({jobId: jobId})}
        />
      }
      {
        Status.Stopped === status &&
        <TooltipButton
          variant="success"
          size="sm"
          iconClassName="bi bi-play-fill text-light"
          tooltipPlacement="left"
          tooltipContent={translate("transfer.jobItem.startButton")}
          onClick={() => ipcDownloadManager.waitJob({jobId: jobId})}
        />
      }
      {
        [Status.Failed, Status.Finished, Status.Stopped, Status.Duplicated].includes(status) &&
        <TooltipButton
          variant="danger"
          size="sm"
          iconClassName="bi bi-x-lg"
          tooltipPlacement="left"
          tooltipContent={translate("transfer.jobItem.removeButton")}
          onClick={() => {
            if (Status.Finished === status) {
              ipcDownloadManager.removeJob({jobId: jobId});
            } else {
              setIsShowRemoveConfirm(true);
            }
          }}
        />
      }
      {
        [Status.Failed].includes(status) &&
        <TooltipButton
          variant="warning"
          size="sm"
          iconClassName="bi bi-arrow-clockwise text-light"
          tooltipPlacement="left"
          tooltipContent={translate("transfer.jobItem.retryButton")}
          onClick={() => ipcDownloadManager.waitJob({jobId: jobId})}
        />
      }
    </>
  );
};

export default DownloadJobOperation;
