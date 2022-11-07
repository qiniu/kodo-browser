import React, {useMemo, useState} from "react";
import {Badge, CloseButton, Tab, Tabs} from "react-bootstrap";
import {toast} from "react-hot-toast";

import {config_path} from "@common/const/app-config";
import ByteSize from "@common/const/byte-size";
import {CreatedDirectoryReplyMessage, JobCompletedReplyMessage} from "@common/ipc-actions/upload";

import {LocalFile} from "@renderer/modules/persistence";
import {useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import Settings from "@renderer/modules/settings";
import {privateEndpointPersistence} from "@renderer/modules/qiniu-client";

import useIpcUpload from "./use-ipc-upload";
import UploadPanel from "./upload-panel";
import useIpcDownload from "./use-ipc-download";
import DownloadPanel from "./download-panel";

import "./transfer-panel.scss";

enum PanelName {
  Upload = "upload",
  Download = "download",
}

interface TransferPanelProps {
  onUploadJobComplete: (data: JobCompletedReplyMessage["data"]["jobUiData"]) => void,
  onCreatedDirectory: (data: CreatedDirectoryReplyMessage["data"]) => void,
}

const TransferPanel: React.FC<TransferPanelProps> = ({
  onUploadJobComplete,
  onCreatedDirectory,
}) => {
  const {currentLanguage, translate} = useI18n();

  const [openPanelName, setOpenPanelName] = useState<PanelName>();

  const {currentUser} = useAuth();
  const customizedEndpoint = useMemo(() => {
    return currentUser?.endpointType === EndpointType.Public
      ? {
        ucUrl: "",
        regions: [],
      }
      : privateEndpointPersistence.read()
  }, [currentUser?.endpointType]);

  // get default settings. use memo to prevent read localStorage every render.
  const defaultSettings = useMemo(() => ({
    isDebug: Boolean(Settings.isDebug),

    enabledResumeUpload: Boolean(Settings.resumeUpload),
    multipartUploadThreshold: Settings.multipartUploadThreshold,
    multipartUploadPartSize: Settings.multipartUploadSize,
    maxUploadConcurrency: Settings.maxUploadConcurrency,
    enabledUploadSpeedLimit: Boolean(Settings.uploadSpeedLimitEnabled),
    uploadSpeedLimit: Settings.uploadSpeedLimitKbPerSec,
    skipEmptyDirectoryUpload: Settings.skipEmptyDirectoryUpload,

    enabledResumeDownload: Boolean(Settings.resumeDownload),
    multipartDownloadThreshold: Settings.multipartDownloadThreshold,
    multipartDownloadPartSize: Settings.multipartDownloadSize,
    maxDownloadConcurrency: Settings.maxDownloadConcurrency,
    enabledDownloadSpeedLimit: Boolean(Settings.downloadSpeedLimitEnabled),
    downloadSpeedLimit: Settings.downloadSpeedLimitKbPerSec,
    overwriteDownload: Settings.overwriteDownload,
  }), []);

  // upload state
  const {
    jobState: uploadJobState,
    setSearchText: setUploadSearchText,
  } = useIpcUpload({
    endpoint: customizedEndpoint,
    user: currentUser,
    config: {
      resumable: defaultSettings.enabledResumeUpload,
      maxConcurrency: defaultSettings.maxUploadConcurrency,
      multipartSize: defaultSettings.multipartUploadPartSize * ByteSize.MB,
      multipartThreshold: defaultSettings.multipartUploadThreshold * ByteSize.MB,
      speedLimit: defaultSettings.enabledUploadSpeedLimit
        ? defaultSettings.uploadSpeedLimit * ByteSize.KB
        : 0,
      isDebug: defaultSettings.isDebug,
      isSkipEmptyDirectory: defaultSettings.skipEmptyDirectoryUpload,
      persistPath: LocalFile.getFilePath(
        config_path,
        `upprog_${currentUser?.accessKey ?? "kodo-browser"}.json`
      ),
      // userNatureLanguage needs mid-dash but i18n using lo_dash
      // @ts-ignore
      userNatureLanguage: currentLanguage.replace("_", "-"),
    },
    onAddedJobs: () => {
      toast.success(translate("transfer.upload.hint.addedJobs"));
      setOpenPanelName(PanelName.Upload);
    },
    // this could be a closure trap.
    // if anything about this not work as expect,
    // change `onUploadJobComplete` to a ref.
    onJobCompleted: ({jobUiData}) => onUploadJobComplete(jobUiData),
    onCreatedDirectory: (data) => onCreatedDirectory(data),
  });

  const uploadProgressText = `${uploadJobState?.finished ?? 0}/${uploadJobState?.total ?? 0}`

  // download state
  const {
    jobState: downloadJobState,
    setSearchText: setDownloadSearchText,
  } = useIpcDownload({
    endpoint: customizedEndpoint,
    user: currentUser,
    config: {
      resumable: defaultSettings.enabledResumeDownload,
      maxConcurrency: defaultSettings.maxDownloadConcurrency,
      multipartSize: defaultSettings.multipartDownloadPartSize * ByteSize.MB,
      multipartThreshold: defaultSettings.multipartDownloadThreshold * ByteSize.MB,
      speedLimit: defaultSettings.enabledDownloadSpeedLimit
        ? defaultSettings.downloadSpeedLimit * ByteSize.KB
        : 0,
      isDebug: defaultSettings.isDebug,
      isOverwrite: defaultSettings.overwriteDownload,
      persistPath: LocalFile.getFilePath(
        config_path,
        `downprog_${currentUser?.accessKey ?? "kodo-browser"}.json`
      ),
      // userNatureLanguage needs mid-dash but i18n using lo_dash
      // @ts-ignore
      userNatureLanguage: currentLanguage.replace("_", "-"),
    },
    onAddedJobs: () => {
      toast.success(translate("transfer.download.hint.addedJobs"));
      setOpenPanelName(PanelName.Download);
    },
    onJobCompleted: () => {
    },
  });

  // render
  const downloadProgressText = `${downloadJobState?.finished ?? 0}/${downloadJobState?.total ?? 0}`

  if (!openPanelName) {
    return (
      <div
        className="transfer-panel-bar d-flex justify-content-around bg-body"
      >
        <div
          className="text-link"
          onClick={() => setOpenPanelName(PanelName.Upload)}
        >
          <i className="bi bi-cloud-upload me-1"/> {uploadProgressText}
        </div>
        <div
          className="text-link"
          onClick={() => setOpenPanelName(PanelName.Download)}
        >
          <i className="bi bi-cloud-download me-1"/> {downloadProgressText}
        </div>
      </div>
    );
  }

  return (
    <div
      className="transfer-panel bg-body p-1"
    >
      <CloseButton
        className="transfer-panel-close-button"
        onClick={() => setOpenPanelName(undefined)}
      />
      <Tabs defaultActiveKey={openPanelName}>
        <Tab
          eventKey={PanelName.Upload}
          title={
            <>
              <i className="bi bi-cloud-upload me-1"/>
              <span className="me-1">{translate("common.upload")}</span>
              <Badge pill bg="secondary">{uploadProgressText}</Badge>
            </>
          }
        >
          <UploadPanel
            data={uploadJobState?.list ?? []}
            onChangeSearchText={setUploadSearchText}
          />
        </Tab>
        <Tab
          eventKey={PanelName.Download}
          title={
            <>
              <i className="bi bi-cloud-download me-1"/>
              <span className="me-1">{translate("common.download")}</span>
              <Badge pill bg="secondary">{downloadProgressText}</Badge>
            </>
          }
        >
          <DownloadPanel
            data={downloadJobState?.list ?? []}
            onChangeSearchText={setDownloadSearchText}
          />
        </Tab>
      </Tabs>
    </div>
  );
};

export default TransferPanel;
