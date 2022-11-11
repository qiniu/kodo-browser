import {dialog as electronDialog} from "@electron/remote";

import React, {useCallback, useEffect, useState} from "react";
import {Button, ButtonGroup, Dropdown, DropdownButton, Form, InputGroup} from "react-bootstrap";
import classNames from "classnames";
import lodash from "lodash";
import {Domain} from "kodo-s3-adapter-sdk/dist/adapter";

import StorageClass from "@common/models/storage-class";
import {translate} from "@renderer/modules/i18n";
import * as FileItem from "@renderer/modules/qiniu-client/file-item";
import {FilesOperationType, useFileOperation} from "@renderer/modules/file-operation";
import {ContentViewStyle} from "@renderer/modules/settings";

import TooltipButton from "@renderer/components/tooltip-button";
import {useDisplayModal} from "@renderer/components/modals/hooks";
import {NON_OWNED_DOMAIN} from "@renderer/components/forms";
import {OperationDoneRecallFn} from "@renderer/components/modals/file/types";
import CreateDirectoryFile from "@renderer/components/modals/file/create-directory-file";
import RenameFile from "@renderer/components/modals/file/rename-file";
import DeleteFiles from "@renderer/components/modals/file/delete-files";
import CopyFiles from "@renderer/components/modals/file/copy-files";
import MoveFiles from "@renderer/components/modals/file/move-files";
import RestoreFiles from "@renderer/components/modals/file/restore-files";
import ChangeFilesStorageClass from "@renderer/components/modals/file/change-files-storage-class";
import GenerateFileLinks from "@renderer/components/modals/file/generate-file-links";

interface FileToolBarProps {
  basePath?: string,
  availableStorageClasses?: Record<string, StorageClass>,
  regionId?: string,
  bucketName?: string,
  directoriesNumber: number,
  listedFileNumber: number,
  hasMoreFiles: boolean,
  selectedFiles: FileItem.Item[],

  loadingDomains: boolean,
  domains: Domain[],
  selectDomain?: Domain,
  onChangeSelectDomain: (domain: Domain | undefined) => void,
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

    loadingDomains,
    domains,
    selectDomain,
    onChangeSelectDomain,
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
  const {fileOperation, setFileOperation} = useFileOperation();

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
  const handleClickUpload = async () => {
    // select files to upload
    const isMac = navigator.userAgent.indexOf("Macintosh") !== -1;
    const {filePaths, canceled} = await electronDialog.showOpenDialog({
      title: translate("transfer.upload.dialog.title"),
      properties: isMac
        ? ["openFile", "openDirectory", "multiSelections"]
        : ["openFile", "multiSelections"],
    });
    if (!filePaths.length || canceled) {
      return;
    }
    onUploadFiles(filePaths);
  }

  // domain state
  const handleChangeDomain = (domainName: string) => {
    onChangeSelectDomain(domains.find(d => d.name === domainName));
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
    <div className="m-1">
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
            onClick={handleShowCreateDirectoryFile}
          >
            <i className="bi bi-folder-plus me-1"/>
            {translate("browse.fileToolbar.createDirectory")}
          </Button>
        </ButtonGroup>
        <ButtonGroup size="sm" className="ms-1">
          <Button
            variant="outline-solid-gray-300"
            onClick={handleClickUpload}
          >
            <i className="bi bi-cloud-upload me-1"/>
            {translate("common.upload")}
          </Button>
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
            disabled={!selectedFiles.length}
            onClick={handleCopyFileOperation}
          >
            <i className="fa fa-clone me-1"/>
            {translate("common.copy")}
          </Button>
          <Button
            variant="outline-solid-gray-300"
            disabled={selectedFiles.length !== 1}
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
            >
              <i className="bi bi-scissors me-1"/>
              {translate("common.move")}
            </Dropdown.Item>
            <Dropdown.Item
              onClick={handleShowDeleteFiles}
            >
              <i className="bi bi-trash me-1 text-danger"/>
              {translate("common.delete")}
            </Dropdown.Item>
            <Dropdown.Item
              onClick={handleShowGenerateFileLinks}
            >
              <i className="bi bi-link-45deg me-1"/>
              {translate("common.extraLinks")}
            </Dropdown.Item>
            <Dropdown.Item
              onClick={handleShowRestoreFiles}
            >
              <i className="bi bi-fire me-1"/>
              {translate("common.restore")}
            </Dropdown.Item>
            <Dropdown.Item
              onClick={handleShowChangeFilesStorageClass}
            >
              <i className="bi bi-arrow-left-right me-1"/>
              {translate("common.changeStorageClass")}
            </Dropdown.Item>
          </DropdownButton>
        </ButtonGroup>

        {
          fileOperation
            ? <ButtonGroup size="sm" className="ms-1">
              <Button
                variant="outline-solid-gray-300"
                disabled={fileOperation.regionId !== regionId}
                onClick={handleClickPaste}
              >
                <i className="bi bi-clipboard2-check me-1"/>
                {translate("common.paste")}({fileOperation.files.length})
              </Button>
              <Button
                className="p-1"
                variant="outline-solid-gray-300"
                onClick={handleCancelFileOperation}
              >
                <i className="bi bi-clipboard2-x text-danger"/>
              </Button>
            </ButtonGroup>
            : null
        }

        <InputGroup className="ms-auto w-15 mxw-25">
          <Form.Select
            size="sm"
            value={selectDomain?.name ?? NON_OWNED_DOMAIN}
            onChange={e => handleChangeDomain(e.target.value)}
          >
            <option value={NON_OWNED_DOMAIN}>{translate("browse.fileToolbar.domain.nonOwnedDomain")}</option>
            {
              domains.map(domain => (
                <option key={domain.name} value={domain.name}>{domain.name}</option>
              ))
            }
          </Form.Select>
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
        <InputGroup size="sm" className="ms-1 w-15 mxw-25">
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
            {listedFileNumber}{hasMoreFiles ? "+" : null}
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
              onCreatedDirectory={(...args) => {
                onCreatedDirectory(...args);
                handleHideCreateDirectoryFile();
              }}
            />
            <RenameFile
              show={isShowRenameFile}
              onHide={handleHideRenameFile}
              regionId={regionId}
              storageClasses={Object.values(availableStorageClasses)}
              bucketName={bucketName}
              basePath={basePath}
              fileItem={selectedFiles[0]}
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
              size="lg"
              show={isShowGenerateFileLinks}
              onHide={handleHideGenerateFileLinks}
              regionId={regionId}
              bucketName={bucketName}
              basePath={basePath}
              fileItems={selectedFiles}
              storageClasses={Object.values(availableStorageClasses)}
              defaultDomain={selectDomain}
            />
          </>
      }
    </div>
  )
};

export default FileToolBar;
