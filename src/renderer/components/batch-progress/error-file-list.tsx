import React from "react";
import {OverlayTrigger, Tooltip} from "react-bootstrap";

import {useI18n} from "@renderer/modules/i18n";
import {FileItem} from "@/renderer/modules/qiniu-client";

export interface ErroredFileOperation {
  fileType: FileItem.ItemType,
  path: string,
  errorMessage: string,
};

interface ErroredFileOperationListProps {
  data: ErroredFileOperation[],
  errorLegend?: string,
  maxLength?: number,
}

const ErrorFileList: React.FC<ErroredFileOperationListProps> = (props) => {
  const {translate} = useI18n();

  const {
    data: erroredFileList,
    errorLegend = translate("common.errored"),
    maxLength = 10,
  } = props;

  return (
    <div>
      <div>
        {errorLegend}
      </div>
      <ul>
        {
          erroredFileList.slice(0, maxLength).map(erroredFile =>
            <li key={erroredFile.path}>
              {
                erroredFile.fileType === FileItem.ItemType.Directory
                  ? <i className="bi bi-folder-fill me-1 text-yellow"/>
                  : <i className="bi bi-file-earmark me-1"/>
              }
              <span className="me-1 text-break-all">{erroredFile.path}</span>
              <OverlayTrigger
                overlay={
                  <Tooltip>
                    {erroredFile.errorMessage}
                  </Tooltip>
                }
              >
                <i className="bi bi-exclamation-circle-fill text-danger"/>
              </OverlayTrigger>
            </li>
          )
        }
        {
          erroredFileList.length > maxLength
            ? <li>...</li>
            : null
        }
      </ul>
    </div>
  );
}

export default ErrorFileList;
