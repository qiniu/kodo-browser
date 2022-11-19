import React from "react";
import {toast} from "react-hot-toast";

import StorageClass from "@common/models/storage-class";

import {useI18n} from "@renderer/modules/i18n";
import {useKodoNavigator} from "@renderer/modules/kodo-address";
import {ContentViewStyle} from "@renderer/modules/settings";
import {FileItem} from "@renderer/modules/qiniu-client";
import {DomainAdapter} from "@renderer/modules/qiniu-client-hooks";

import {useDisplayModal} from "@renderer/components/modals/hooks";
import {OperationDoneRecallFn} from "@renderer/components/modals/file/types";
import GenerateFileLink from "@renderer/components/modals/file/generate-file-link";
import RestoreFile from "@renderer/components/modals/file/restore-file";
import ChangeFileStorageClass from "@renderer/components/modals/file/change-file-storage-class";
import DeleteFiles from "@renderer/components/modals/file/delete-files";
import PreviewFile from "@renderer/components/modals/preview-file";

import {OperationName} from "./types";
import FileTable from "./file-table";
import FileGrid from "./file-grid";
import {useFileOperation} from "@renderer/modules/file-operation";

interface FileContentProps {
  viewStyle: ContentViewStyle,
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
  selectDomain?: DomainAdapter,
  onReloadFiles: OperationDoneRecallFn,
}

const FileContent: React.FC<FileContentProps> = ({
  viewStyle,
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
  const {translate} = useI18n();
  const {currentAddress, goTo} = useKodoNavigator();
  const {bucketGrantedPermission} = useFileOperation();

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
      hideModal: handleHideGeneratingLink,
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
      hideModal: handleHideRestoreFile,
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
      hideModal: handleHideChangeFileStorageClass,
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
      hideModal: handleHideDeleteFiles,
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
      hideModal: handleHidePreviewFile,
    },
  ] = useDisplayModal<{ fileItem: FileItem.File | null }>({
    fileItem: null
  });

  // handle events
  const changePathByDirectory = (file: FileItem.Folder) => {
    goTo({
      protocol: currentAddress.protocol,
      path: `${file.bucket}/${file.path.toString()}`,
    });
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
        if (!selectDomain) {
          toast.error(translate("common.noDomainToGet"));
          break;
        }
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
      {
        viewStyle === ContentViewStyle.Table
          ? <FileTable
            regionId={regionId}
            availableStorageClasses={availableStorageClasses}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={onLoadMore}
            data={data}
            selectedFiles={selectedFiles}
            onSelectFiles={onSelectFiles}
            onClickFile={f =>
              FileItem.isItemFolder(f) &&
              changePathByDirectory(f)
            }
            onDoubleClickFile={f => {
              if (FileItem.isItemFile(f)) {
                if (!selectDomain) {
                  toast.error(translate("common.noDomainToGet"));
                  return;
                }
                handleClickPreviewFile({fileItem: f});
              }
            }}
            onAction={handleFileOperation}
          />
          : <FileGrid
            loading={loading}
            hasMore={hasMore}
            onLoadMore={onLoadMore}
            data={data}
            selectedFiles={selectedFiles}
            onSelectFiles={onSelectFiles}
            onDoubleClickFile={f => {
              if (FileItem.isItemFile(f)) {
                if (!selectDomain) {
                  toast.error(translate("common.noDomainToGet"));
                  return;
                }
                handleClickPreviewFile({fileItem: f});
              }
              if (FileItem.isItemFolder(f)) {
                changePathByDirectory(f)
              }
            }}
          />
      }

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
              canS3Domain={!bucketGrantedPermission}
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
            {
              !selectDomain
                ? null
                : <PreviewFile
                  size="lg"
                  show={isShowPreviewFile}
                  onHide={() => handleHidePreviewFile({fileItem: null})}
                  regionId={regionId}
                  bucketName={bucketName}
                  basePath={basePath}
                  fileItem={fileItemForPreview}
                  storageClasses={Object.values(availableStorageClasses)}
                  canS3Domain={!bucketGrantedPermission}
                  domain={selectDomain}
                  onClickDownload={onDownloadFile}
                  onOperationDone={onReloadFiles}
                />
            }
          </>
      }
    </>
  );
}

export default FileContent;
