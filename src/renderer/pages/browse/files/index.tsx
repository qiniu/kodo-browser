import path from "path";

import {dialog as electronDialog} from '@electron/remote'
import React, {useEffect, useMemo, useState} from "react";
import {toast} from "react-hot-toast";
import {Region} from "kodo-s3-adapter-sdk";
import {Domain} from "kodo-s3-adapter-sdk/dist/adapter";

import {BackendMode} from "@common/qiniu";
import StorageClass from "@common/models/storage-class";

import * as LocalLogger from "@renderer/modules/local-logger";
import {useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {KodoNavigator, useKodoNavigator} from "@renderer/modules/kodo-address";
import Settings, {ContentViewStyle} from "@renderer/modules/settings";

import {BucketItem, FileItem, privateEndpointPersistence} from "@renderer/modules/qiniu-client";
import {isItemFile, isItemFolder} from "@renderer/modules/qiniu-client/file-item";
import {useLoadDomains, useLoadFiles} from "@renderer/modules/qiniu-client-hooks";
import ipcDownloadManager from "@renderer/modules/electron-ipc-manages/ipc-download-manager";

import DropZone from "@renderer/components/drop-zone";
import {useDisplayModal, useIsShowAnyModal} from "@renderer/components/modals/hooks";
import UploadFilesConfirm from "@renderer/components/modals/file/upload-files-confirm";

import FileToolBar from "./file-tool-bar";
import FileContent from "./file-content";
import "./files.scss";

interface FilesProps {
  prepareLoading: boolean,
  region?: Region,
  bucket?: BucketItem,
  toggleRefresh?: boolean,
}

const Files: React.FC<FilesProps> = (props) => {
  const {currentLanguage, translate} = useI18n();
  const {currentUser} = useAuth();
  const customizedEndpoint = useMemo(() => {
    return currentUser?.endpointType === EndpointType.Public
      ? {
        ucUrl: "",
        regions: [],
      }
      : privateEndpointPersistence.read()
  }, [currentUser?.endpointType]);
  const {currentAddress, basePath, goTo} = useKodoNavigator();

  // files selector
  const [selectedFiles, setSelectedFiles] = useState<Map<string, FileItem.Item>>(new Map());
  const handleChangeSelectedFiles = (files: FileItem.Item[], checked: boolean) => {
    if (checked) {
      setSelectedFiles(m => {
        for (const f of files) {
          m.set(f.path.toString(), f);
        }
        return new Map(m);
      });
    } else {
      setSelectedFiles(m => {
        for (const f of files) {
          m.delete(f.path.toString());
        }
        return new Map(m);
      });
    }
  };

  // files loader
  const {
    loadFilesState: {
      loading: loadingFiles,
      listMarker: fileListMarker,
      files,
    },
    loadFiles,
  } = useLoadFiles({
    user: currentUser,
    regionId: props.region?.s3Id,
    bucketName: props.bucket?.name,
    storageClasses: props.region?.storageClasses,
    currentAddressPath: currentAddress.path,
    pageSize: Settings.filesLoadingSize,
    shouldAutoReload: () => {
      if (props.prepareLoading) {
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
    ],
  });

  const handleReloadFiles = ({
    originBasePath,
  }: {
    originBasePath: string,
  }) => {
    setSelectedFiles(m => {
      m.clear();
      return new Map(m);
    });
    if (basePath === undefined || originBasePath !== basePath) {
      return;
    }
    loadFiles(
      basePath,
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
    loadFiles(
      basePath,
      fileListMarker,
    )
      .catch(err => {
        toast.error(err.toString());
        LocalLogger.error(err);
      });
  };

  useEffect(() => {
    if (fileListMarker && !Settings.stepByStepLoadingFiles) {
      handleLoadMore();
    }
  }, [fileListMarker]);

  // available storage classes
  const availableStorageClasses = useMemo<Record<string, StorageClass> | undefined>(() => {
    if (!props.region) {
      return;
    }
    return props.region.storageClasses.reduce<Record<string, StorageClass>>((res, storageClass) => {
      res[storageClass.kodoName] = storageClass;
      return res;
    }, {});
  }, [props.region?.storageClasses]);

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
      if (props.prepareLoading) {
        return false;
      }
      if (!props.region || !props.bucket) {
        toast.error("region or bucket not found!");
        return false;
      }
      setSelectedFiles(new Map());
      return true;
    },
  });
  const [selectDomain, setSelectDomain] = useState<Domain | undefined>();

  // search by prefix
  const searchPrefix = currentAddress.path.slice(
    currentAddress.path.lastIndexOf("/") + 1
  );
  const handleSearchPrefix = (prefix: string) => {
    const baseDirPath = currentAddress.path.endsWith("/")
      ? currentAddress.path
      : KodoNavigator.getBaseDir(currentAddress.path);
    goTo({
      protocol: currentAddress.protocol,
      path: `${baseDirPath}${prefix}`,
    });
  };

  // view style
  const [viewStyle, setViewStyle] = useState(Settings.contentViewStyle);
  const handleChangeViewStyle = (style: ContentViewStyle) => {
    setViewStyle(style);
    Settings.contentViewStyle = style;
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

  // handle upload and download
  const handleUploadFiles = async (filePaths: string[]) => {
    if (!filePaths.length) {
      toast.error(translate("transfer.upload.error.nothing"))
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
      return
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
      size: isItemFile(f) ? f.size : 0,
      mtime: isItemFile(f) ? f.lastModified.getTime() : 0,
      isDirectory: isItemFolder(f),
      isFile: isItemFile(f),
    }));

    toast(translate("transfer.download.hint.addingJobs"));
    ipcDownloadManager.addJobs({
      remoteObjects,
      destPath: destDirectoryPath,
      downloadOptions: {
        region: currentRegion.s3Id,
        bucket: currentBucket.name,
        domain: selectDomain,
        isOverwrite: Settings.overwriteDownload,
        storageClasses: currentRegion.storageClasses,
        // userNatureLanguage needs mid-dash but i18n using lo_dash
        // @ts-ignore
        userNatureLanguage: currentLanguage.replace("_", "-"),
      },
      clientOptions: {
        accessKey: currentUser.accessKey,
        secretKey: currentUser.accessSecret,
        ucUrl: customizedEndpoint.ucUrl,
        regions: customizedEndpoint.regions.map(r => ({
          id: "",
          s3Id: r.identifier,
          label: r.label,
          s3Urls: [r.endpoint],
        })),
        backendMode: selectDomain ? BackendMode.Kodo : BackendMode.S3
      },
    })
  };

  return (
    <>
      <FileToolBar
        basePath={basePath}
        availableStorageClasses={availableStorageClasses}
        regionId={props.region?.s3Id}
        bucketName={props.bucket?.name}
        directoriesNumber={files.filter(f => isItemFolder(f)).length}
        listedFileNumber={files.length}
        hasMoreFiles={Boolean(fileListMarker)}
        selectedFiles={[...selectedFiles.values()]}

        loadingDomains={loadingDomains}
        domains={domains}
        selectDomain={selectDomain}
        onChangeSelectDomain={setSelectDomain}
        onReloadDomains={loadDomains}

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
        loading={props.prepareLoading || loadingFiles}
        availableStorageClasses={availableStorageClasses}
        data={files}
        hasMore={Boolean(fileListMarker)}
        onLoadMore={handleLoadMore}
        selectedFiles={selectedFiles}
        onSelectFiles={handleChangeSelectedFiles}
        onDownloadFile={f => handleDownloadFiles([f])}

        basePath={basePath}
        regionId={props.region?.s3Id}
        bucketName={props.bucket?.name}
        selectDomain={selectDomain}
        onReloadFiles={handleReloadFiles}
      />

      <DropZone
        className="files-upload-zone bg-body bg-opacity-75"
        enterText={translate("transfer.upload.dropZone.enter")}
        overText={translate("transfer.upload.dropZone.over")}
        disabled={isShowAnyModal}
        onDropped={handleUploadFiles}
      />

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
            />
          </>
      }
    </>
  );
};

export default Files;
