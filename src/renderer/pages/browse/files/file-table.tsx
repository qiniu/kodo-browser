import React from "react";
import {Domain} from "kodo-s3-adapter-sdk/dist/adapter";

import StorageClass from "@common/models/storage-class";
import {FileItem} from "@renderer/modules/qiniu-client";
import {isItemFile, isItemFolder} from "@renderer/modules/qiniu-client/file-item";
import {useKodoNavigator} from "@renderer/modules/kodo-address";

import {useDisplayModal} from "@renderer/components/modals/hooks";
import {OperationDoneRecallFn} from "@renderer/components/modals/file/types";
import GenerateFileLink from "@renderer/components/modals/file/generate-file-link";
import RestoreFile from "@renderer/components/modals/file/restore-file";
import ChangeFileStorageClass from "@renderer/components/modals/file/change-file-storage-class";
import DeleteFiles from "@renderer/components/modals/file/delete-files";
import PreviewFile from "@renderer/components/modals/preview-file";

import FileBaseTable, {OperationName} from "./file-base-table";

interface FileTableProps {
  loading: boolean,
  availableStorageClasses?: Record<string, StorageClass>,
  data: FileItem.Item[],
  hasMore: boolean,
  onLoadMore: () => void,
  selectedFiles: Map<string, FileItem.Item>,
  onSelectFiles: (file: FileItem.Item[], checked: boolean) => void,
  onDownloadFile: (file: FileItem.Item) => void,

  // operation state
  basePath?: string,
  regionId?: string,
  bucketName?: string,
  selectDomain?: Domain,
  onReloadFiles: OperationDoneRecallFn,
}

const FileTable: React.FC<FileTableProps> = ({
  loading,
  availableStorageClasses,
  data,
  hasMore,
  onLoadMore,
  selectedFiles,
  onSelectFiles,
  onDownloadFile,
  basePath,
  regionId,
  bucketName,
  selectDomain,
  onReloadFiles,
}) => {
  const {currentAddress, goTo} = useKodoNavigator();

  // modal states
  const [
    {
      show: isShowGenerateFileLink,
      data: {
        fileItem: fileItemForGeneratingLink,
      },
    },
    {
      showModal: handleClickGeneratingLink,
      closeModal: handleHideGeneratingLink,
    },
  ] = useDisplayModal<{ fileItem: FileItem.File | null }>({
    fileItem: null
  });

  const [
    {
      show: isShowRestoreFile,
      data: {
        fileItem: fileItemForRestore,
      },
    },
    {
      showModal: handleClickRestoreFile,
      closeModal: handleHideRestoreFile,
    },
  ] = useDisplayModal<{ fileItem: FileItem.File | null }>({
    fileItem: null
  });

  const [
    {
      show: isShowChangeFileStorageClass,
      data: {
        fileItem: fileItemForChangeStorageClass,
      },
    },
    {
      showModal: handleClickChangeFileStorageClass,
      closeModal: handleHideChangeFileStorageClass,
    },
  ] = useDisplayModal<{ fileItem: FileItem.File | null }>({
    fileItem: null
  });

  const [
    {
      show: isShowDeleteFiles,
      data: {
        fileItem: fileItemForDeleting,
      },
    },
    {
      showModal: handleClickDeleteFiles,
      closeModal: handleHideDeleteFiles,
    },
  ] = useDisplayModal<{ fileItem: FileItem.Item | null }>({
    fileItem: null
  });

  const [
    {
      show: isShowPreviewFile,
      data: {
        fileItem: fileItemForPreview,
      },
    },
    {
      showModal: handleClickPreviewFile,
      closeModal: handleHidePreviewFile,
    },
  ] = useDisplayModal<{ fileItem: FileItem.File | null }>({
    fileItem: null
  });

  // handle events
  const handleClickFile = (file: FileItem.Item) => {
    if (isItemFolder(file)) {
      goTo({
        protocol: currentAddress.protocol,
        path: `${file.bucket}/${file.path.toString()}`,
      });
    }
  };

  const handleDoubleClickFile = (file: FileItem.Item) => {
    if (isItemFile(file)) {
      handleClickPreviewFile({fileItem: file});
    }
  };
  
  const handleFileOperation = (action: OperationName, file: FileItem.Item) => {
    switch (action) {
      case OperationName.Restore:
        FileItem.isItemFile(file) && handleClickRestoreFile({fileItem: file});
        break;
      case OperationName.Download:
        onDownloadFile(file);
        break;
      case OperationName.GenerateLink:
        FileItem.isItemFile(file) && handleClickGeneratingLink({fileItem: file});
        break;
      case OperationName.ChangeStorageClass:
        FileItem.isItemFile(file) && handleClickChangeFileStorageClass({fileItem: file});
        break;
      case OperationName.Delete:
        handleClickDeleteFiles({fileItem: file})
        break;
    }
  };

  return (
    <>
      <FileBaseTable
        availableStorageClasses={availableStorageClasses}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        data={data}
        selectedFiles={selectedFiles}
        onSelectFiles={onSelectFiles}
        onClickFile={handleClickFile}
        onDoubleClickFile={handleDoubleClickFile}
        onAction={handleFileOperation}
      />

      {
        regionId === undefined || bucketName === undefined || basePath === undefined || availableStorageClasses === undefined
          ? null
          : <>
            <DeleteFiles
              show={isShowDeleteFiles}
              onHide={() => handleHideDeleteFiles({fileItem: null})}
              regionId={regionId}
              storageClasses={Object.values(availableStorageClasses)}
              bucketName={bucketName}
              basePath={basePath}
              fileItems={fileItemForDeleting ? [fileItemForDeleting] : []}
              onDeletedFile={onReloadFiles}
            />
            <RestoreFile
              show={isShowRestoreFile}
              onHide={() => handleHideRestoreFile({fileItem: null})}
              regionId={regionId}
              bucketName={bucketName}
              fileItem={fileItemForRestore}
            />
            <GenerateFileLink
              show={isShowGenerateFileLink}
              onHide={() => handleHideGeneratingLink({fileItem: null})}
              regionId={regionId}
              bucketName={bucketName}
              fileItem={fileItemForGeneratingLink}
              defaultDomain={selectDomain}
            />
            <ChangeFileStorageClass
              show={isShowChangeFileStorageClass}
              onHide={() => handleHideChangeFileStorageClass({fileItem: null})}
              regionId={regionId}
              bucketName={bucketName}
              basePath={basePath}
              fileItem={fileItemForChangeStorageClass}
              storageClasses={Object.values(availableStorageClasses)}
              onChangedFilesStorageClass={(...args) => {
                onReloadFiles(...args);
                handleHideChangeFileStorageClass({fileItem: null});
              }}
            />
            <PreviewFile
              size="lg"
              show={isShowPreviewFile}
              onHide={() => handleHidePreviewFile({fileItem: null})}
              regionId={regionId}
              bucketName={bucketName}
              basePath={basePath}
              fileItem={fileItemForPreview}
              storageClasses={Object.values(availableStorageClasses)}
              domain={selectDomain}
              onClickDownload={onDownloadFile}
              onOperationDone={onReloadFiles}
            />
          </>
      }
    </>
  );
}

export default FileTable;
