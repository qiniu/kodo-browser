import React, {PropsWithChildren} from "react";

import StorageClass from "@common/models/storage-class";

import {FileItem} from "@renderer/modules/qiniu-client";
import {DomainAdapter} from "@renderer/modules/qiniu-client-hooks";

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
  canS3Domain: boolean,
  defaultDomain: DomainAdapter | undefined,
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
  canS3Domain,
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
          canS3Domain={canS3Domain}
          defaultDomain={defaultDomain}
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
