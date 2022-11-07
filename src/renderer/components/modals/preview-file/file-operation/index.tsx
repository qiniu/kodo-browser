import React, {PropsWithChildren} from "react";
import {Domain} from "kodo-s3-adapter-sdk/dist/adapter";

import StorageClass from "@common/models/storage-class";

import {FileItem} from "@renderer/modules/qiniu-client";

import {OperationDoneRecallFn} from "../../file/types";
import ChangeStorageClass from "./change-storage-class";
import GenerateLink from "./generate-link";

export enum FileOperationType {
  None = "none",
  GenerateLink = "generateLink",
  ChangeStorageClass = "changeStorageClass",
}

interface FileOperationProps {
  fileOperationType: FileOperationType,
  regionId: string,
  bucketName: string,
  basePath: string,
  fileItem: FileItem.File,
  defaultDomain: Domain | undefined,
  storageClasses: StorageClass[],
  operationPortal: React.FC<PropsWithChildren>,
  onHideOperation: () => void,
  onOperationDone: OperationDoneRecallFn,
}

const FileOperation: React.FC<FileOperationProps> = ({
  fileOperationType,
  regionId,
  bucketName,
  basePath,
  fileItem,
  defaultDomain,
  storageClasses,
  operationPortal,
  onHideOperation,
  onOperationDone,
}) => {
  switch (fileOperationType) {
    case FileOperationType.GenerateLink:
      return (
        <GenerateLink
          fileItem={fileItem}
          regionId={regionId}
          bucketName={bucketName}
          defaultDomain={defaultDomain}
          submitButtonPortal={operationPortal}
        />
      );
    case FileOperationType.ChangeStorageClass:
      return (
        <ChangeStorageClass
          regionId={regionId}
          bucketName={bucketName}
          basePath={basePath}
          fileItem={fileItem}
          storageClasses={storageClasses}
          submitButtonPortal={operationPortal}
          onChangedFileStorageClass={(...args) => {
            onHideOperation();
            onOperationDone(...args);
          }}
        />
      );
  }
  return null;
};

export default FileOperation
