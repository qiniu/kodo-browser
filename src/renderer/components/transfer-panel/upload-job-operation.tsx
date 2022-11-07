import React, {useState} from "react";
import {Button} from "react-bootstrap";

import {Status} from "@common/models/job/types";
import {useI18n} from "@renderer/modules/i18n";
import ipcUploadManager from "@renderer/modules/electron-ipc-manages/ipc-upload-manager";

import TooltipButton from "@renderer/components/tooltip-button";

interface UpJobOperationProps {
  jobId: string,
  status: Status,
  resumable?: boolean,
}

const UploadJobOperation: React.FC<UpJobOperationProps> = ({
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
          onClick={() => ipcUploadManager.removeJob({jobId})}
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
          onClick={() => ipcUploadManager.stopJob({jobId: jobId})}
        />
      }
      {
        resumable && Status.Stopped === status &&
        <TooltipButton
          variant="success"
          size="sm"
          iconClassName="bi bi-play-fill text-light"
          tooltipPlacement="left"
          tooltipContent={translate("transfer.jobItem.startButton")}
          onClick={() => ipcUploadManager.waitJob({jobId: jobId})}
        />
      }
      {
        [Status.Failed, Status.Finished, Status.Stopped].includes(status) &&
          <TooltipButton
            variant="danger"
            size="sm"
            iconClassName="bi bi-x-lg"
            tooltipPlacement="left"
            tooltipContent={translate("transfer.jobItem.removeButton")}
            onClick={() => {
              if (Status.Finished === status) {
                ipcUploadManager.removeJob({jobId: jobId});
              } else {
                setIsShowRemoveConfirm(true);
              }
            }}
          />
      }
      {
        [Status.Duplicated, Status.Failed].includes(status) &&
        <TooltipButton
          variant="warning"
          size="sm"
          iconClassName="bi bi-arrow-clockwise text-light"
          tooltipPlacement="left"
          tooltipContent={
            Status.Duplicated === status
              ? translate("transfer.jobItem.retryWithOverwriteButton")
              : translate("transfer.jobItem.retryButton")
          }
          onClick={() => {
            Status.Duplicated === status
              ? ipcUploadManager.startJob({
                jobId,
                options: {
                  forceOverwrite: true,
                },
              })
              : ipcUploadManager.waitJob({jobId: jobId})
          }}
        />
      }
    </>
  );
};

export default UploadJobOperation;
