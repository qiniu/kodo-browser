import React from "react";

import {useI18n} from "@renderer/modules/i18n";
import {FileItem} from "@renderer/modules/qiniu-client";

import TooltipButton from "@renderer/components/tooltip-button";

import {OperationName, RowCellDataProps} from "../../types";

export interface FileOperationsCellCallbackProps {
  onAction: (action: OperationName, file: FileItem.Item) => void,
}

const FileOperations: React.FC<
  RowCellDataProps & FileOperationsCellCallbackProps &
  {
    canChangeStorageClass: boolean,
  }
> = ({
  rowData: file,
  canChangeStorageClass,
  onAction,
}) => {
  const {translate} = useI18n();

  const isFile = FileItem.isItemFile(file);
  const isDirectory = FileItem.isItemFolder(file);
  const canRestore = isFile && ["Archive", "DeepArchive"].includes(file.storageClass);
  return (
    <>
      {
        !isDirectory && canRestore &&
        <TooltipButton
          iconClassName="bi bi-fire"
          tooltipPlacement="top"
          tooltipContent={translate("common.restore")}
          variant="icon-dark"
          className="me-1"
          onClick={e => {
            e.stopPropagation();
            onAction(OperationName.Restore, file);
          }}
        />
      }
      <TooltipButton
        iconClassName="bi bi-download"
        tooltipPlacement="top"
        tooltipContent={translate("common.download")}
        variant="icon-dark"
        className="me-1"
        onClick={e => {
          e.stopPropagation();
          onAction(OperationName.Download, file);
        }}
      />
      {
        isFile &&
        <TooltipButton
          iconClassName="bi bi-link-45deg"
          tooltipPlacement="top"
          tooltipContent={translate("common.extraLink")}
          variant="icon-dark"
          className="me-1"
          onClick={e => {
            e.stopPropagation();
            onAction(OperationName.GenerateLink, file);
          }}
        />
      }
      {
        isFile && canChangeStorageClass &&
        <TooltipButton
          iconClassName="bi bi-arrow-left-right"
          tooltipPlacement="top"
          tooltipContent={translate("common.changeStorageClass")}
          variant="icon-dark"
          className="me-1"
          onClick={e => {
            e.stopPropagation();
            onAction(OperationName.ChangeStorageClass, file);
          }}
        />
      }
      <TooltipButton
        iconClassName="bi bi-trash"
        tooltipPlacement="top"
        tooltipContent={translate("common.delete")}
        variant="icon-danger"
        onClick={e => {
          e.stopPropagation();
          onAction(OperationName.Delete, file);
        }}
      />
    </>
  )
};

export default FileOperations;
