import React from "react";

import {useI18n} from "@renderer/modules/i18n";
import {FileItem} from "@renderer/modules/qiniu-client";
import {useFileOperation} from "@renderer/modules/file-operation";

import TooltipButton from "@renderer/components/tooltip-button";

import {OperationName, RowCellDataProps} from "../../types";
import {EndpointType, useAuth} from "@renderer/modules/auth";

export interface FileOperationsCellCallbackProps {
  onAction: (action: OperationName, file: FileItem.Item) => void,
}

const FileOperations: React.FC<RowCellDataProps & FileOperationsCellCallbackProps &
  {
    canChangeStorageClass: boolean,
  }> = ({
  rowData: file,
  canChangeStorageClass,
  onAction,
}) => {
  const {translate} = useI18n();
  const {currentUser} = useAuth();
  const {bucketGrantedPermission} = useFileOperation();

  const isFile = FileItem.isItemFile(file);
  const canRestore = isFile && ["Archive", "DeepArchive"].includes(file.storageClass);


  return (
    <>
      {
        bucketGrantedPermission === "readonly" ||
        !isFile ||
        !canRestore
          ? null
          : <TooltipButton
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
        isFile ||
        !currentUser ||
        currentUser.endpointType !== EndpointType.Public
          ? null
          : <TooltipButton
            iconClassName="bi bi-share"
            tooltipPlacement="top"
            tooltipContent={translate("common.share")}
            variant="icon-dark"
            className="me-1"
            onClick={e => {
              e.stopPropagation();
              onAction(OperationName.ShareDir, file);
            }}
          />
      }
      {
        !isFile
          ? null
          : <TooltipButton
            iconClassName="bi bi-link-45deg"
            tooltipPlacement="top"
            tooltipContent={translate("common.exportLink")}
            variant="icon-dark"
            className="me-1"
            onClick={e => {
              e.stopPropagation();
              onAction(OperationName.GenerateLink, file);
            }}
          />
      }
      {
        bucketGrantedPermission === "readonly" ||
        !isFile ||
        !canChangeStorageClass
          ? null
          : <TooltipButton
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
      {
        bucketGrantedPermission === "readonly"
          ? null
          : <TooltipButton
            iconClassName="bi bi-trash"
            tooltipPlacement="top"
            tooltipContent={translate("common.delete")}
            variant="icon-danger"
            onClick={e => {
              e.stopPropagation();
              onAction(OperationName.Delete, file);
            }}
          />
      }
    </>
  )
};

export default FileOperations;
