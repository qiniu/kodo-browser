import React, {createContext, PropsWithChildren, useContext, useState} from "react";

import {BackendMode} from "@common/qiniu";

import * as FileItem from "@renderer/modules/qiniu-client/file-item";

export enum FilesOperationType {
  Copy = "copy",
  Move = "move",
}

export interface FileOperation {
  action: FilesOperationType,
  bucketName: string,
  regionId: string,
  files: FileItem.Item[],
  basePath: string,
}

const FileOperationContext = createContext<{
  bucketPreferBackendMode?: BackendMode,
  bucketGrantedPermission?: 'readonly' | 'readwrite',
  fileOperation: FileOperation | null,
  setFileOperation: (operation: FileOperation | null) => void,
}>({
  bucketPreferBackendMode: undefined,
  bucketGrantedPermission: undefined,
  fileOperation: null,
  setFileOperation: () => {},
});

export const Provider: React.FC<PropsWithChildren<{
  bucketPreferBackendMode?: BackendMode,
  bucketGrantedPermission?: 'readonly' | 'readwrite',
  defaultFileOperation?: FileOperation,
}>> = ({
  bucketPreferBackendMode,
  bucketGrantedPermission,
  defaultFileOperation = null,
  children,
}) => {
  const [fileOperation, setFileOperation] = useState<FileOperation | null>(defaultFileOperation);

  return (
    <FileOperationContext.Provider value={{
      bucketPreferBackendMode,
      bucketGrantedPermission,
      fileOperation,
      setFileOperation,
    }}>
      {children}
    </FileOperationContext.Provider>
  );
};

export function useFileOperation() {
  return useContext(FileOperationContext);
}
