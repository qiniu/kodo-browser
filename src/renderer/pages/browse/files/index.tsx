import path from "path";

import {dialog as electronDialog} from '@electron/remote'
import React, {useEffect, useMemo, useState, useSyncExternalStore} from "react";
import {toast} from "react-hot-toast";
import {Region} from "kodo-s3-adapter-sdk";

import StorageClass from "@common/models/storage-class";
import {BackendMode} from "@common/qiniu";

import * as LocalLogger from "@renderer/modules/local-logger";
import {useI18n} from "@renderer/modules/i18n";
import {useAuth} from "@renderer/modules/auth";
import {KodoNavigator, useKodoNavigator} from "@renderer/modules/kodo-address";
import {ContentViewStyle, appPreferences, useEndpointConfig} from "@renderer/modules/user-config-store";

import {BucketItem, FileItem, isAccelerateUploadingAvailable} from "@renderer/modules/qiniu-client";
import {DomainAdapter, useLoadDomains, useLoadFiles} from "@renderer/modules/qiniu-client-hooks";
import ipcDownloadManager from "@renderer/modules/electron-ipc-manages/ipc-download-manager";
import * as AuditLog from "@renderer/modules/audit-log";
import {useFileOperation} from "@renderer/modules/file-operation";

import DropZone from "@renderer/components/drop-zone";
import {useDisplayModal, useIsShowAnyModal} from "@renderer/components/modals/hooks";
import UploadFilesConfirm from "@renderer/components/modals/file/upload-files-confirm";
import ipcUploadManager from "@renderer/modules/electron-ipc-manages/ipc-upload-manager";

import FileToolBar from "./file-tool-bar";
import FileContent from "./file-content";
import "./files.scss";

interface FilesProps {
  region?: Region,
  bucket?: BucketItem,
  toggleRefresh?: boolean,
}

const Files: React.FC<FilesProps> = (props) => {
  const {currentLanguage, translate} = useI18n();
  const {currentUser, shareSession} = useAuth();
  const {bucketGrantedPermission} = useFileOperation();

  const {
    state: appPreferencesState,
    data: appPreferencesData,
  } = useSyncExternalStore(
    appPreferences.store.subscribe,
    appPreferences.store.getSnapshot,
  );

  const {
    endpointConfigData,
  } = useEndpointConfig(currentUser, shareSession);

  const {currentAddress, basePath, goTo} = useKodoNavigator();

  // files selector
  const [selectedFiles, setSelectedFiles] = useState<Map<string, FileItem.Item>>(new Map());
  const handleChangeSelectedFiles = (files: FileItem.Item[], checked: boolean) => {
    if (checked) {
      setSelectedFiles(m => {
        for (const f of files) {
          // prevent empty name file conflict with prefix item
          const selectedItemId = [f.itemType, f.path.toString()].join(":");
          m.set(selectedItemId, f);
        }
        return new Map(m);
      });
    } else {
      setSelectedFiles(m => {
        for (const f of files) {
          if (FileItem.isItemPrefix(f)) {
            // auto remove all items stated with the unchecked prefix
            for (const item of m.values()) {
              if (item.path.toString().startsWith(f.path.toString())) {
                m.delete([item.itemType, item.path.toString()].join(":"));
              }
            }
          }
          // prevent empty name file conflict with prefix item
          const selectedItemId = [f.itemType, f.path.toString()].join(":");
          m.delete(selectedItemId);
        }
        return new Map(m);
      });
    }
  };

  // search by prefix
  const searchPrefix = currentAddress.path.slice(
    currentAddress.path.lastIndexOf("/") + 1
  );
  const handleSearchPrefix = (prefix: string) => {
    const baseDirPath = currentAddress.path.endsWith("/")
      ? currentAddress.path
      : KodoNavigator.getBaseDir(currentAddress.path);
    goTo({
      path: `${baseDirPath}${prefix}`,
    });
  };

  // files loader
  const {
    loadFilesState: {
      loading: loadingFiles,
      hasMore: hasMoreFiles,
      loadMoreFailed: loadMoreFilesFailed,
      files,
    },
    reload: reloadFiles,
    loadMore: loadMoreFiles,
  } = useLoadFiles({
    user: currentUser,
    regionId: props.region?.s3Id,
    bucketName: props.bucket?.name,
    storageClasses: props.region?.storageClasses,
    currentAddressPath: currentAddress.path,
    pageSize: appPreferencesData.filesItemLoadSize,
    shouldAutoReload: () => {
      if (!appPreferencesState.initialized) {
        return false;
      }
      if (!props.region || !props.bucket) {
        toast.error("region or bucket not found!");
        return false;
      }
      setSelectedFiles(new Map());
      return true;
    },
    autoReloadDeps: [
      props.toggleRefresh,
      appPreferencesState.initialized,
    ],
    preferBackendMode: props.bucket?.preferBackendMode,
    defaultLoadAll: !appPreferencesData.filesItemLazyLoadEnabled,
  });

  const handleReloadFiles = ({
    originBasePath,
  }: {
    originBasePath: string,
  }) => {
    setSelectedFiles(new Map());
    let p = basePath;
    if (p === undefined || originBasePath !== basePath) {
      return;
    }
    if (searchPrefix) {
      p = `${basePath}${searchPrefix}`
    }
    reloadFiles(
      p,
      !appPreferencesData.filesItemLazyLoadEnabled,
    )
      .catch(err => {
        toast.error(err.toString());
        LocalLogger.error(err);
      });
  }

  const handleLoadMore = () => {
    if (basePath === undefined) {
      return;
    }
    loadMoreFiles()
      .catch(err => {
        toast.error(err.toString());
        LocalLogger.error(err);
      });
  };

  // available storage classes
  const availableStorageClasses = useMemo<Record<string, StorageClass> | undefined>(() => {
    if (!props.region) {
      return;
    }
    return props.region.storageClasses.reduce<Record<string, StorageClass>>((res, storageClass) => {
      res[storageClass.kodoName] = storageClass;
      return res;
    }, {});
  }, [props.region?.storageClasses?.length]);

  // bucket accelerate uploading
  const [canAccelerateUploading, setCanAccelerateUploading] = useState<boolean>(false);
  const [fetchingAccelerateUploading, setFetchingAccelerateUploading] = useState<boolean>(false);
  const fetchAccelerateUploading = ({
    needFeedback,
    refreshCache,
  }: {
    needFeedback?: boolean,
    refreshCache?: boolean,
  } = {}) => {
    if (!currentUser || !props.bucket || fetchingAccelerateUploading) {
      return;
    }
    const opt = {
      id: currentUser.accessKey,
      secret: currentUser.accessSecret,
      endpointType: currentUser.endpointType,
    }
    setFetchingAccelerateUploading(true);
    let p = isAccelerateUploadingAvailable(
      currentUser,
      props.bucket?.name,
      opt,
      refreshCache,
    );
    if (needFeedback) {
      p = toast.promise(p, {
        loading: translate("common.refreshing"),
        success: translate("common.refreshed"),
        error: err => `${translate("common.failed")}: ${err}`,
      });
    }
    p.then(setCanAccelerateUploading)
      .catch(err => LocalLogger.error(err))
      .finally(() => setFetchingAccelerateUploading(false));
  };
  const refreshCanAccelerateUploading = () => {
    ipcUploadManager.clearRegionsCache();
    fetchAccelerateUploading({
      needFeedback: true,
      refreshCache: true,
    });
  };

  // domains loader and selector
  const {
    loadDomainsState: {
      loading: loadingDomains,
      domains,
    },
    loadDomains,
  } = useLoadDomains({
    user: currentUser,
    regionId: props.region?.s3Id,
    bucketName: props.bucket?.name,
    shouldAutoReload: () => {
      if (!props.region || !props.bucket) {
        toast.error("region or bucket not found!");
        return false;
      }
      return true;
    },
    canDefaultS3Domain: !bucketGrantedPermission,
    preferBackendMode: props.bucket?.preferBackendMode,
  });
  const [selectedDomain, setSelectedDomain] = useState<DomainAdapter | undefined>();
  useEffect(() => {
    setSelectedDomain(prevDomain =>
      domains.find(d => d.name === prevDomain?.name) ?? domains[0]
    );
  }, [domains]);

  const handleReloadDomains = () => {
    toast.promise(loadDomains(), {
      loading: translate("common.refreshing"),
      success: translate("common.refreshed"),
      error: err => `${translate("common.failed")}: ${err}`,
    });
  };

  // view style
  const viewStyle = appPreferencesData.contentViewStyle;
  const handleChangeViewStyle = (style: ContentViewStyle) => {
    appPreferences.set("contentViewStyle", style);
  };

  // modal state
  const isShowAnyModal = useIsShowAnyModal();
  const [
    {
      show: isShowUploadFilesConfirm,
      data: {
        filePaths: filePathsForUploadConfirm,
      },
    },
    {
      showModal: showUploadFilesConfirm,
      hideModal: handleHideUploadFilesConfirm,
    },
  ] = useDisplayModal<{filePaths: string[]}>({
    filePaths: []
  });
  useEffect(() => {
    if (!isShowUploadFilesConfirm) {
      return;
    }
    ipcUploadManager.clearRegionsCache();
    fetchAccelerateUploading({
      refreshCache: true,
    });
  }, [isShowUploadFilesConfirm]);

  // handle upload and download
  const handleUploadFiles = async (filePaths: string[]) => {
    if (!filePaths.length) {
      toast.error(translate("transfer.upload.error.nothing"));
      return;
    }
    // check is duplicated basename to prevent create same directory
    const fileNames = filePaths.map(p => path.basename(p));
    const isSomeDuplicatedBasename = fileNames.some((p, i) => fileNames.indexOf(p) < i);
    if (isSomeDuplicatedBasename) {
      toast.error(translate("transfer.upload.error.duplicatedBasename"));
      return;
    }
    showUploadFilesConfirm({filePaths});
  }

  const handleDownloadFiles = async (files: FileItem.Item[]) => {
    const currentRegion = props.region;
    const currentBucket = props.bucket;
    if (!currentRegion || !currentBucket || !currentUser) {
      return;
    }
    if (!selectedDomain) {
      toast.error(translate("common.noDomainToGet"));
      return;
    }

    // select save path
    const {filePaths: [destPath], canceled} = await electronDialog.showOpenDialog({
      title: translate("transfer.download.dialog.title"),
      properties: ["openDirectory"],
    });
    if (!destPath || canceled) {
      return;
    }
    const destDirectoryPath = destPath.endsWith(path.sep)
      ? destPath
      : destPath + path.sep

    // transfer files to remote path
    const remoteObjects = files.map(f => ({
      region: currentRegion.s3Id,
      bucket: f.bucket,
      key: f.path.toString(),
      name: f.name,
      size: FileItem.isItemFile(f) ? f.size : 0,
      mtime: FileItem.isItemFile(f) ? f.lastModified.getTime() : 0,
      isDirectory: FileItem.isItemFolder(f),
      isFile: FileItem.isItemFile(f),
    }));

    toast(translate("transfer.download.hint.addingJobs"));
    AuditLog.log(AuditLog.Action.DownloadFilesStart, {
      regionId: currentRegion.s3Id,
      bucket: currentBucket.name,
      to: destDirectoryPath,
      from: remoteObjects.map(i => i.key),
    });
    ipcDownloadManager.addJobs({
      remoteObjects,
      destPath: destDirectoryPath,
      downloadOptions: {
        region: currentRegion.s3Id,
        bucket: currentBucket.name,
        domain: selectedDomain,
        isOverwrite: appPreferencesData.overwriteDownloadEnabled,
        storageClasses: currentRegion.storageClasses,
        // userNatureLanguage needs mid-dash but i18n using lo_dash
        // @ts-ignore
        userNatureLanguage: currentLanguage.replace("_", "-"),
      },
      clientOptions: {
        accessKey: currentUser.accessKey,
        secretKey: currentUser.accessSecret,
        sessionToken: shareSession?.sessionToken,
        bucketNameId: shareSession
          ? {
            [shareSession.bucketName]: shareSession.bucketId,
          }
          : undefined,
        ucUrl: endpointConfigData.ucUrl,
        regions: endpointConfigData.regions.map(r => ({
          id: "",
          s3Id: r.identifier,
          label: r.label,
          s3Urls: [r.endpoint],
        })),
        backendMode: selectedDomain.apiScope as BackendMode,
      },
    });
  };

  return (
    <>
      <FileToolBar
        basePath={basePath}
        availableStorageClasses={availableStorageClasses}
        regionId={props.region?.s3Id}
        bucketName={props.bucket?.name}
        directoriesNumber={files.filter(f => FileItem.isItemFolder(f)).length}
        listedFileNumber={files.length}
        hasMoreFiles={hasMoreFiles}
        selectedFiles={[...selectedFiles.values()]}
        couldShowSelectPrefix={
          Array.from(selectedFiles.values()).some(FileItem.isItemPrefix) ||
          (
            hasMoreFiles &&
            files.length > 0 &&
            selectedFiles.size === files.length
          )
        }
        onSelectPrefix={handleChangeSelectedFiles}

        loadingDomains={loadingDomains}
        domains={domains}
        selectedDomain={selectedDomain}
        onChangeDomain={setSelectedDomain}
        onReloadDomains={handleReloadDomains}

        defaultSearchText={searchPrefix}
        onSearch={handleSearchPrefix}

        viewStyle={viewStyle}
        onChangeView={handleChangeViewStyle}

        onCreatedDirectory={handleReloadFiles}
        onRenamedFile={handleReloadFiles}
        onUploadFiles={filePaths => showUploadFilesConfirm({filePaths})}
        onDownloadFiles={handleDownloadFiles}
        onDeletedFiles={handleReloadFiles}
        onCopiedFiles={handleReloadFiles}
        onMovedFiles={handleReloadFiles}
        onChangedFilesStorageClass={handleReloadFiles}
      />

      <FileContent
        viewStyle={viewStyle}
        loading={loadingFiles}
        availableStorageClasses={availableStorageClasses}
        data={files}
        hasMore={hasMoreFiles}
        loadMoreFailed={loadMoreFilesFailed}
        onLoadMore={handleLoadMore}
        selectedFiles={selectedFiles}
        onSelectFiles={handleChangeSelectedFiles}
        onDownloadFile={f => handleDownloadFiles([f])}

        basePath={basePath}
        regionId={props.region?.s3Id}
        bucketName={props.bucket?.name}
        selectDomain={selectedDomain}
        onReloadFiles={handleReloadFiles}
      />
      {
        bucketGrantedPermission === "readonly"
          ? null
          : <DropZone
            className="files-upload-zone bg-body bg-opacity-75"
            enterText={translate("transfer.upload.dropZone.enter")}
            overText={translate("transfer.upload.dropZone.over")}
            disabled={isShowAnyModal}
            onDropped={handleUploadFiles}
          />
      }
      {
        !props.region || !props.bucket
          ? null
          : <>
            <UploadFilesConfirm
              show={isShowUploadFilesConfirm}
              onHide={() => handleHideUploadFilesConfirm({filePaths: []})}
              regionId={props.region.s3Id}
              bucketName={props.bucket.name}
              destPath={basePath ?? ""}
              filePaths={filePathsForUploadConfirm}
              storageClasses={Object.values(availableStorageClasses ?? {})}
              canAccelerateUploading={canAccelerateUploading}
              onClickRefreshCanAccelerateUploading={() => refreshCanAccelerateUploading()}
            />
          </>
      }
    </>
  );
};

export default Files;
