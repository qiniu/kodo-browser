import React from "react";
import {Button} from "react-bootstrap";

import {FileItem} from "@renderer/modules/qiniu-client";

import {CellDataProps, OperationName} from "../types";

export interface FileOperationsCellProps {
  onAction: (action: OperationName, file: FileItem.Item) => void,
}

const FileOperations: React.FC<CellDataProps & FileOperationsCellProps> = ({
  rowData: file,
  onAction,
}) => {
  const isFile = FileItem.isItemFile(file);
  const isDirectory = FileItem.isItemFolder(file);
  const canRestore = isFile && ["Archive", "DeepArchive"].includes(file.storageClass);
  return (
    <>
      {
        !isDirectory && canRestore &&
        <Button
          variant="icon-dark"
          className="me-1"
          onClick={e => {
            e.stopPropagation();
            onAction(OperationName.Restore, file);
          }}
        >
          <i className="bi bi-fire"/>
        </Button>
      }
      <Button
        variant="icon-dark"
        className="me-1"
        onClick={e => {
          e.stopPropagation();
          onAction(OperationName.Download, file);
        }}
      >
        <i className="bi bi-download"/>
      </Button>
      {
        isFile &&
        <Button
          variant="icon-dark"
          className="me-1"
          onClick={e => {
            e.stopPropagation();
            onAction(OperationName.GenerateLink, file);
          }}
        >
          <i className="bi bi-link-45deg"/>
        </Button>
      }
      {
        isFile &&
        <Button
          variant="icon-dark"
          className="me-1"
          onClick={e => {
            e.stopPropagation();
            onAction(OperationName.ChangeStorageClass, file);
          }}
        >
          <i className="fa fa-exchange"/>
        </Button>
      }
      <Button
        variant="icon-danger"
        onClick={e => {
          e.stopPropagation();
          onAction(OperationName.Delete, file);
        }}
      >
        <i className="bi bi-trash"/>
      </Button>
    </>
  )
};

export default FileOperations;
