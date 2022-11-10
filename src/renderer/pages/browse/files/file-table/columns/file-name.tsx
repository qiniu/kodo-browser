import React from "react";
import classNames from "classnames";

import {FileItem} from "@renderer/modules/qiniu-client";

import {RowCellDataProps} from "../../types";

export interface FileNameCellProps {
  onClickFile: (file: FileItem.Item) => void,
  onDoubleClickFile: (file: FileItem.Item) => void,
}

const FileName: React.FC<RowCellDataProps & FileNameCellProps> = ({
  rowData: file,
  cellData: fileName,
  onClickFile,
  onDoubleClickFile,
}) => (
  <span
    tabIndex={0}
    className="text-link overflow-ellipsis"
    // style={{
    //   ["--line-num" as any]: 3,
    // }}
    onKeyUp={e => {
      if (e.code === "Space") {
        e.stopPropagation();
        onDoubleClickFile(file);
      }
      if (e.code === "Enter") {
        e.stopPropagation();
        onClickFile(file);
      }
    }}
    onClick={e => {
      e.stopPropagation();
      onClickFile(file);
    }}
    onDoubleClick={e => {
      e.stopPropagation();
      onDoubleClickFile(file);
    }}
  >
    <i
      className={classNames(
        "me-1 text-decoration-none",
        FileItem.getFileIconClassName(file),
        FileItem.isItemFolder(file) ? "text-yellow" : "text-body",
      )}
    />
    {fileName}
  </span>
);

export default FileName;
