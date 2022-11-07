import React, {createContext, PropsWithChildren, useContext, useState} from "react";

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
  fileOperation: FileOperation | null,
  setFileOperation: (operation: FileOperation | null) => void,
}>({
  fileOperation: null,
  setFileOperation: () => {},
});

export const Provider: React.FC<PropsWithChildren<{
  defaultFileOperation?: FileOperation,
}>> = ({
  defaultFileOperation = null,
  children,
}) => {
  const [fileOperation, setFileOperation] = useState<FileOperation | null>(defaultFileOperation);

  return (
    <FileOperationContext.Provider value={{
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
