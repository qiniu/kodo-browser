import {dialog as electronDialog} from "@electron/remote";
import OpenDialogOptions = Electron.OpenDialogOptions;

import React, {useCallback, useEffect, useState} from "react";
import {Button, ButtonGroup, Dropdown, DropdownButton, Form, InputGroup} from "react-bootstrap";
import {toast} from "react-hot-toast";
import classNames from "classnames";
import lodash from "lodash";

import StorageClass from "@common/models/storage-class";

import {translate} from "@renderer/modules/i18n";
import {FileItem} from "@renderer/modules/qiniu-client";
import {FilesOperationType, useFileOperation} from "@renderer/modules/file-operation";
import {ContentViewStyle} from "@renderer/modules/user-config-store";
import {DomainAdapter} from "@renderer/modules/qiniu-client-hooks";

import TooltipButton from "@renderer/components/tooltip-button";
import DomainNameSelect from "@renderer/components/forms/generate-link-form/domain-name-select";
import {useDisplayModal} from "@renderer/components/modals/hooks";
import {OperationDoneRecallFn} from "@renderer/components/modals/file/types";
import CreateDirectoryFile from "@renderer/components/modals/file/create-directory-file";
import RenameFile from "@renderer/components/modals/file/rename-file";
import DeleteFiles from "@renderer/components/modals/file/delete-files";
import CopyFiles from "@renderer/components/modals/file/copy-files";
import MoveFiles from "@renderer/components/modals/file/move-files";
import RestoreFiles from "@renderer/components/modals/file/restore-files";
import ChangeFilesStorageClass from "@renderer/components/modals/file/change-files-storage-class";
import GenerateFileLinks from "@renderer/components/modals/file/generate-file-links";

import SelectPrefix from "./select-prefix";

const MAX_FILE_LIST_SIZE = 9999;
// check if an Electron app is running on macOS
const isMac = navigator.userAgent.indexOf("Macintosh") !== -1;

interface FileToolBarProps {
  basePath?: string,
  availableStorageClasses?: Record<string, StorageClass>,
  regionId?: string,
  bucketName?: string,
  bucketPermission?: "readonly" | "readwrite",
  directoriesNumber: number,
  listedFileNumber: number,
  hasMoreFiles: boolean,
  selectedFiles: FileItem.Item[],
  couldShowSelectPrefix: boolean,
  onSelectPrefix: (prefix: FileItem.Prefix[], checked: boolean) => void,

  loadingDomains: boolean,
  domains: DomainAdapter[],
  selectedDomain?: DomainAdapter,
  onChangeDomain: (domain: DomainAdapter | undefined) => void,
  onReloadDomains: () => void,
  onUploadFiles: (filePaths: string[]) => void,
  onDownloadFiles: (files: FileItem.Item[]) => void,

  defaultSearchText: string,
  onSearch: (searchText: string) => void,

  viewStyle: ContentViewStyle,
  onChangeView: (style: ContentViewStyle) => void,

  onCreatedDirectory: OperationDoneRecallFn,
  onRenamedFile: OperationDoneRecallFn,
  onDeletedFiles: OperationDoneRecallFn,
  onCopiedFiles: OperationDoneRecallFn,
  onMovedFiles: OperationDoneRecallFn,
  onChangedFilesStorageClass: OperationDoneRecallFn,
}

const FileToolBar: React.FC<FileToolBarProps> = (props) => {
  const {
    basePath,
    availableStorageClasses,
    regionId,
    bucketName,
    directoriesNumber,
    listedFileNumber,
    hasMoreFiles,
    selectedFiles,
    couldShowSelectPrefix,
    onSelectPrefix,

    loadingDomains,
    domains,
    selectedDomain,
    onChangeDomain,
    onReloadDomains,
    onUploadFiles,
    onDownloadFiles,

    defaultSearchText,
    onSearch,

    viewStyle,
    onChangeView,

    onCreatedDirectory,
    onRenamedFile,
    onDeletedFiles,
    onCopiedFiles,
    onMovedFiles,
    onChangedFilesStorageClass
  } = props;

  // file operation state
  const {bucketGrantedPermission, fileOperation, setFileOperation} = useFileOperation();

  const handleCopyFileOperation = () => {
    if (!bucketName || !regionId || basePath === undefined) {
      return;
    }
    setFileOperation({
      action: FilesOperationType.Copy,
      bucketName: bucketName,
      regionId: regionId,
      files: selectedFiles,
      basePath: basePath,
    });
  }

  const handleCutFileOperation = () => {
    if (!bucketName || !regionId || basePath === undefined) {
      return;
    }
    setFileOperation({
      action: FilesOperationType.Move,
      bucketName: bucketName,
      regionId: regionId,
      files: selectedFiles,
      basePath: basePath,
    });
  }

  const handleCancelFileOperation = () => {
    setFileOperation(null);
  }

  const handleClickPaste = () => {
    if (!fileOperation) {
      return;
    }
    if (fileOperation.action === FilesOperationType.Copy) {
      handleShowCopyFiles();
    }
    if (fileOperation.action === FilesOperationType.Move) {
      handleShowMoveFiles();
    }
  }

  // handle upload
  const handleClickUpload = async (isOpenDirectory = false) => {
    // select files to upload
    let properties: OpenDialogOptions["properties"]
    if (isMac) {
      properties = ["openFile", "openDirectory", "multiSelections"];
    } else if (isOpenDirectory) {
      properties = ["openDirectory", "multiSelections"];
    } else {
      properties = ["openFile", "multiSelections"];
    }
    const {filePaths, canceled} = await electronDialog.showOpenDialog({
      title: translate("transfer.upload.dialog.title"),
      properties,
    });
    if (!filePaths.length || canceled) {
      return;
    }
    onUploadFiles(filePaths);
  }

  // search state
  const [searchText, setSearchText] = useState<string>("");
  useEffect(() => {
    setSearchText(defaultSearchText);
  }, [defaultSearchText]);

  const handleSearchDebounced = useCallback(lodash.debounce((target: string) => {
    onSearch(target);
  }, 500), [onSearch]);

  // modal state
  const [
    {
      show: isShowCreateDirectoryFile,
    },
    {
      showModal: handleShowCreateDirectoryFile,
      hideModal: handleHideCreateDirectoryFile,
    },
  ] = useDisplayModal();

  const [
    {
      show: isShowRenameFile,
    },
    {
      showModal: handleShowRenameFile,
      hideModal: handleHideRenameFile,
    },
  ] = useDisplayModal();

  const [
    {
      show: isShowDeleteFiles,
    },
    {
      showModal: handleShowDeleteFiles,
      hideModal: handleHideDeleteFiles,
    },
  ] = useDisplayModal();

  const [
    {
      show: isShowCopyFiles,
    },
    {
      showModal: handleShowCopyFiles,
      hideModal: handleHideCopyFiles,
    },
  ] = useDisplayModal();

  const [
    {
      show: isShowMoveFiles,
    },
    {
      showModal: handleShowMoveFiles,
      hideModal: handleHideMoveFiles,
    },
  ] = useDisplayModal();

  const [
    {
      show: isShowRestoreFiles,
    },
    {
      showModal: handleShowRestoreFiles,
      hideModal: handleHideRestoreFiles,
    },
  ] = useDisplayModal();

  const [
    {
      show: isShowChangeFilesStorageClass,
    },
    {
      showModal: handleShowChangeFilesStorageClass,
      hideModal: handleHideChangeFilesStorageClass,
    },
  ] = useDisplayModal();

  const [
    {
      show: isShowGenerateFileLinks,
    },
    {
      showModal: handleShowGenerateFileLinks,
      hideModal: handleHideGenerateFileLinks,
    },
  ] = useDisplayModal();

  return (
    <>
      <div className="m-1 d-flex justify-content-between">
        <div className="d-flex">
          <ButtonGroup size="sm" aria-label="directory info">
            {
              directoriesNumber
                ? <Button className="text-white" variant="info">
                  <i className="bi bi-folder-fill me-1 text-yellow"/>
                  {directoriesNumber}
                </Button>
                : null
            }
            <Button
              className="text-white"
              variant="info"
              disabled={bucketGrantedPermission === "readonly"}
              onClick={handleShowCreateDirectoryFile}
            >
              <i className="bi bi-folder-plus me-1"/>
              {translate("browse.fileToolbar.createDirectory")}
            </Button>
          </ButtonGroup>
          <ButtonGroup size="sm" className="ms-1">
            <Button
              variant="outline-solid-gray-300"
              disabled={bucketGrantedPermission === "readonly"}
              onClick={() => handleClickUpload()}
            >
              <i className="bi bi-cloud-upload me-1"/>
              {translate("common.upload")}
            </Button>
            {
              !isMac && <Button
                variant="outline-solid-gray-300"
                disabled={bucketGrantedPermission === "readonly"}
                onClick={() => handleClickUpload(true)}
              >
                <i className="bi bi-cloud-upload me-1"/>
                {translate("browse.fileToolbar.uploadDirectory")}
              </Button>
            }
            <Button
              variant="outline-solid-gray-300"
              disabled={!selectedFiles.length}
              onClick={() => onDownloadFiles(selectedFiles)}
            >
              <i className="bi bi-cloud-download me-1"/>
              {translate("common.download")}
            </Button>
            <Button
              variant="outline-solid-gray-300"
              disabled={!selectedFiles.length || bucketGrantedPermission === "readonly"}
              onClick={handleCopyFileOperation}
            >
              <i className="fa fa-clone me-1"/>
              {translate("common.copy")}
            </Button>
            <Button
              variant="outline-solid-gray-300"
              disabled={
                selectedFiles.length !== 1 ||
                selectedFiles.some(FileItem.isItemPrefix) ||
                bucketGrantedPermission === "readonly"
              }
              onClick={handleShowRenameFile}
            >
              <i className="bi bi-pencil me-1"/>
              {translate("common.rename")}
            </Button>
            <DropdownButton
              as={ButtonGroup}
              variant="outline-solid-gray-300"
              size="sm"
              title={translate("common.more")}
              disabled={!selectedFiles.length}
            >
              <Dropdown.Item
                onClick={handleCutFileOperation}
                hidden={bucketGrantedPermission === "readonly"}
              >
                <i className="bi bi-scissors me-1"/>
                {translate("common.move")}
              </Dropdown.Item>
              <Dropdown.Item
                onClick={handleShowDeleteFiles}
                hidden={bucketGrantedPermission === "readonly"}
              >
                <i className="bi bi-trash me-1 text-danger"/>
                {translate("common.delete")}
              </Dropdown.Item>
              <Dropdown.Item
                onClick={() => {
                  if (!domains.length) {
                    toast.error(translate("common.noDomainToGet"));
                    return;
                  }
                  handleShowGenerateFileLinks();
                }}
              >
                <i className="bi bi-link-45deg me-1"/>
                {translate("common.exportLinks")}
              </Dropdown.Item>
              <Dropdown.Item
                onClick={handleShowRestoreFiles}
                hidden={bucketGrantedPermission === "readonly"}
              >
                <i className="bi bi-fire me-1"/>
                {translate("common.restore")}
              </Dropdown.Item>
              {
                bucketGrantedPermission === "readonly" ||
                !availableStorageClasses ||
                !Object.keys(availableStorageClasses).length
                  ? null
                  : <Dropdown.Item
                    onClick={handleShowChangeFilesStorageClass}
                  >
                    <i className="bi bi-arrow-left-right me-1"/>
                    {translate("common.changeStorageClass")}
                  </Dropdown.Item>
              }
            </DropdownButton>
          </ButtonGroup>
          {
            !fileOperation
              ? null
              : <ButtonGroup size="sm" className="ms-1">
                <Button
                  variant="outline-solid-gray-300"
                  disabled={fileOperation.regionId !== regionId}
                  onClick={handleClickPaste}
                >
                  <i className="bi bi-clipboard2-check me-1"/>
                  <span>{translate("common.paste")}</span>
                  {
                    fileOperation.files.some(FileItem.isItemPrefix)
                      ? null
                      : <span>({fileOperation.files.length})</span>
                  }
                </Button>
                <Button
                  className="p-1"
                  variant="outline-solid-gray-300"
                  onClick={handleCancelFileOperation}
                >
                  <i className="bi bi-clipboard2-x text-danger"/>
                </Button>
              </ButtonGroup>
          }
        </div>

        <div className="d-flex" style={{width: "33%", maxWidth: "33rem"}}>
          {
            !domains.length
              ? null
              : <InputGroup>
                <DomainNameSelect
                  size="sm"
                  name="selectedDomain"
                  onChange={onChangeDomain}
                  options={domains}
                />
                <TooltipButton
                  size="sm"
                  iconClassName={classNames(
                    "bi bi-arrow-repeat",
                    {
                      "loading-spin": loadingDomains,
                    },
                  )}
                  tooltipPlacement="bottom"
                  tooltipContent={translate("browse.fileToolbar.domain.refreshTooltip")}
                  onClick={onReloadDomains}
                />
              </InputGroup>
          }
          <InputGroup size="sm" className="ms-1">
            <Form.Control
              type="text"
              placeholder={translate("browse.fileToolbar.search.holder")}
              value={searchText}
              onChange={e => {
                setSearchText(e.target.value);
                handleSearchDebounced(e.target.value);
              }}
              onKeyDown={e => {
                if (e.code === "Enter") {
                  e.stopPropagation();
                  onSearch(searchText);
                }
              }}
            />
            <InputGroup.Text>
              <i className="bi bi-search me-1"/>
              {Math.min(listedFileNumber, MAX_FILE_LIST_SIZE)}
              {(listedFileNumber > MAX_FILE_LIST_SIZE || hasMoreFiles) ? "+" : null}
            </InputGroup.Text>
          </InputGroup>
          <ButtonGroup size="sm" className="ms-1">
            <Button
              variant={viewStyle === ContentViewStyle.Table ? "primary" : "outline-solid-gray-300"}
              onClick={() => onChangeView(ContentViewStyle.Table)}
            >
              <i className="bi bi-list"/>
            </Button>
            <Button
              variant={viewStyle === ContentViewStyle.Grid ? "primary" : "outline-solid-gray-300"}
              onClick={() => onChangeView(ContentViewStyle.Grid)}
            >
              <i className="bi bi-grid"/>
            </Button>
          </ButtonGroup>
        </div>
      </div>

      {
        couldShowSelectPrefix &&
        <SelectPrefix
          selectedFiles={selectedFiles}
          onSelectPrefixes={onSelectPrefix}
        />
      }

      {
        regionId === undefined || bucketName === undefined || basePath === undefined || availableStorageClasses === undefined
          ? null
          : <>
            <CreateDirectoryFile
              show={isShowCreateDirectoryFile}
              onHide={handleHideCreateDirectoryFile}
              regionId={regionId}
              bucketName={bucketName}
              basePath={basePath}
              onCreatedDirectory={onCreatedDirectory}
            />
            <RenameFile
              show={isShowRenameFile}
              onHide={handleHideRenameFile}
              regionId={regionId}
              storageClasses={Object.values(availableStorageClasses)}
              bucketName={bucketName}
              basePath={basePath}
              fileItem={
                selectedFiles.find<FileItem.File | FileItem.Folder>(
                  (i): i is FileItem.File | FileItem.Folder =>
                    FileItem.isItemType<FileItem.File | FileItem.Folder>(i, [FileItem.ItemType.File, FileItem.ItemType.Directory])
                )
              }
              onRenamedFile={onRenamedFile}
            />
            <DeleteFiles
              show={isShowDeleteFiles}
              onHide={handleHideDeleteFiles}
              regionId={regionId}
              storageClasses={Object.values(availableStorageClasses)}
              bucketName={bucketName}
              basePath={basePath}
              fileItems={selectedFiles}
              onDeletedFile={onDeletedFiles}
            />
            <CopyFiles
              show={isShowCopyFiles}
              onHide={handleHideCopyFiles}
              regionId={regionId}
              storageClasses={Object.values(availableStorageClasses)}
              bucketName={bucketName}
              basePath={basePath}
              fileItems={fileOperation?.files ?? []}
              originBasePath={fileOperation?.basePath ?? ""}
              onCopiedFile={(...args) => {
                setFileOperation(null);
                onCopiedFiles(...args);
              }}
            />
            <MoveFiles
              show={isShowMoveFiles}
              onHide={handleHideMoveFiles}
              regionId={regionId}
              storageClasses={Object.values(availableStorageClasses)}
              bucketName={bucketName}
              basePath={basePath}
              fileItems={fileOperation?.files ?? []}
              originBasePath={fileOperation?.basePath ?? ""}
              onMovedFile={(...args) => {
                setFileOperation(null);
                onMovedFiles(...args);
              }}
            />
            <RestoreFiles
              show={isShowRestoreFiles}
              onHide={handleHideRestoreFiles}
              regionId={regionId}
              storageClasses={Object.values(availableStorageClasses)}
              bucketName={bucketName}
              basePath={basePath}
              fileItems={selectedFiles}
              onRestoredFile={() => {
              }}
            />
            <ChangeFilesStorageClass
              show={isShowChangeFilesStorageClass}
              onHide={handleHideChangeFilesStorageClass}
              regionId={regionId}
              bucketName={bucketName}
              basePath={basePath}
              fileItems={selectedFiles}
              storageClasses={Object.values(availableStorageClasses)}
              onChangedFilesStorageClass={onChangedFilesStorageClass}
            />
            <GenerateFileLinks
              show={isShowGenerateFileLinks}
              onHide={handleHideGenerateFileLinks}
              regionId={regionId}
              bucketName={bucketName}
              basePath={basePath}
              fileItems={selectedFiles}
              storageClasses={Object.values(availableStorageClasses)}
              canS3Domain={!bucketGrantedPermission}
              defaultDomain={selectedDomain}
            />
          </>
      }
    </>
  )
};


export default FileToolBar;
