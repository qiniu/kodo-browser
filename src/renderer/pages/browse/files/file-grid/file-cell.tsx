import React, {MouseEventHandler} from "react";
import {Card} from "react-bootstrap";
import classNames from "classnames";

import {byteSizeFormat} from "@common/const/byte-size";
import {useI18n} from "@renderer/modules/i18n";
import {FileItem} from "@renderer/modules/qiniu-client";

export type CellData = FileItem.Item & {
  id: string,
  isSelected: boolean,
}

interface FileCellProps {
  data: CellData,
  onClick: (f: CellData) => void,
  onDoubleClick: (f: CellData) => void,
}

const FileCell: React.FC<FileCellProps> = ({
  data,
  onClick,
  onDoubleClick,
}) => {
  const {translate} = useI18n();

  const handleClick: MouseEventHandler = (e) => {
    switch (e.detail) {
      case 1: {
        return onClick(data);
      }
      case 2: {
        return onDoubleClick(data);
      }
    }
  }

  return (
    <Card
      border={data.isSelected ? "primary" : undefined}
      className="file-cell card-horizontal h-100"
      onClick={handleClick}
    >
      <Card.Img
        as="i"
        className={classNames(
          "text-center",
          FileItem.getFileIconClassName(data),
          FileItem.isItemFolder(data) ? "text-yellow" : "text-body",
        )}
      />
      <Card.Body>
        <Card.Title className="overflow-ellipsis-one-line w-100">
          {data.name}
        </Card.Title>
        <Card.Subtitle className="text-secondary">
          {
            FileItem.isItemFile(data)
              ? byteSizeFormat(data.size)
              : translate("common.directory")
          }
        </Card.Subtitle>
      </Card.Body>
      {
        data.isSelected &&
        <div className="selected-mark">
          <i className="bi bi-check text-primary"/>
        </div>
      }
    </Card>
  );
};

export default FileCell;
