import React from "react";
import {ProgressBar} from "react-bootstrap";

import {byteSizeFormat} from "@common/const/byte-size";
import {durationFormat} from "@common/const/duration";
import {isLocalPath, Status} from "@common/models/job/types";
import TransferJob from "@common/models/job/transfer-job";

import {ADDR_KODO_PROTOCOL} from "@renderer/const/kodo-nav";
import TooltipText from "@renderer/components/tooltip-text";
import {translate} from "@renderer/modules/i18n";
import {Status2I18nKey} from "@renderer/modules/i18n/extra";

interface JobItemProps {
  namePrefix?: string,
  data: TransferJob["uiData"],
  operationButtons?: React.ReactNode,
}

const JobItem: React.FC<JobItemProps> = ({
  namePrefix,
  data,
  operationButtons,
}) => {
  const {
    status,
    from,
    to,
    message,
    progress,
    speed,
    estimatedDuration,
  } = data;
  return (
    <div className={`job-item job-status-${status.toLowerCase()}`}>
      <div className="job-item-name">
        <TooltipText
          tooltipContent={
            <>
              <div className="text-start">
                <span className="text-info">From: </span>
                {
                  isLocalPath(from)
                    ? from.path
                    : `${ADDR_KODO_PROTOCOL}${from.bucket}/${from.key}`
                }
              </div>
              <div className="text-start">
                <span className="text-success">To: </span>
                {
                  isLocalPath(to)
                    ? to.path
                    : `${ADDR_KODO_PROTOCOL}${to.bucket}/${to.key}`
                }
              </div>
            </>
          }
        >
          <div className="overflow-ellipsis">
            {namePrefix}
            {
              (isLocalPath(to) && to.name)
              ||
              (isLocalPath(from) && from.name)
            }
          </div>
        </TooltipText>
        <ProgressBar
          animated={[Status.Running, Status.Verifying].includes(status)}
          now={progress.loaded * 100 / progress.total}
        />
      </div>
      <div className="job-item-status">
        {
          Status.Running === status
            ? `${byteSizeFormat(speed)}/s`
            : translate(Status2I18nKey[status])
        }
      </div>
      <div className="job-item-progress-text overflow-ellipsis">
        {
          Status.Running === status
            ? `${byteSizeFormat(progress.loaded)}/`
            : null
        }
        {byteSizeFormat(progress.total)}
        {
          Status.Running === status
            ? `, ${durationFormat(estimatedDuration)}`
            : null
        }
      </div>
      <div className="job-item-failed text-danger">
        {
          [Status.Failed, Status.Duplicated].includes(status)
            ? <TooltipText
              tooltipContent={
                Status.Duplicated === status
                  ? translate("transfer.jobItem.fileDuplicated")
                  : message.trim() || translate("transfer.jobItem.unknownError")
              }
            >
              <i className="bi bi-exclamation-triangle-fill text-danger"/>
            </TooltipText>
            : null
        }
      </div>
      <div className="job-item-operation">
        {operationButtons}
      </div>
    </div>
  );
};

export default JobItem;
