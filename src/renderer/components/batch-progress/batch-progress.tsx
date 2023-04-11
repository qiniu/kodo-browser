import React from "react";
import {Button, ProgressBar} from "react-bootstrap";

import {useI18n} from "@renderer/modules/i18n";

import {BatchTaskStatus} from "./types";

interface BatchProgressProps {
  status: BatchTaskStatus,
  total: number,
  finished: number,
  errored: number,
  isPercent?: boolean,
  onClickInterrupt?: () => void,
}

const BatchProgress: React.FC<BatchProgressProps> = (props) => {
  const {translate} = useI18n();

  const {
    status,
    total,
    finished,
    errored,
    onClickInterrupt,
    isPercent = false,
  } = props;

  // calculate error bar min-width(1%) to prevent not visible if too few errors
  const hasError = errored > 0;
  const erroredPercent = hasError ? Math.max(errored * 100 / total, 1) : 0;
  // fallback 0, because it will get NaN, if total is 0.
  const finishedPercent = Math.min(finished * 100 / total, hasError ? 99 : 100) || 0;

  return (
    <div>
      <ProgressBar>
        <ProgressBar
          animated={status === BatchTaskStatus.Running}
          striped
          variant="success"
          now={finishedPercent}
          key={1}/>
        <ProgressBar
          animated={status === BatchTaskStatus.Running}
          striped
          variant="danger"
          now={erroredPercent}
          key={2}
        />
      </ProgressBar>
      <div className="d-flex align-items-center">
        <div>
          {
            isPercent
              ? `${finishedPercent.toFixed(2)}%`
              : `${finished} / ${total}`
          }
        </div>
        {
          !onClickInterrupt || status !== BatchTaskStatus.Running
            ? null
            : <Button
              className="ms-auto"
              size="sm"
              variant="lite-danger"
              onClick={onClickInterrupt}
            >
              {translate("common.interrupt")}
            </Button>
        }
      </div>
    </div>
  );
};

export default BatchProgress;
