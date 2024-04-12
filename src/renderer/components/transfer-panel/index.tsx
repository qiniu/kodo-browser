import path from "path";

import React, {useCallback, useEffect, useState, useSyncExternalStore} from "react";
import {Badge, CloseButton, Tab, Tabs} from "react-bootstrap";
import {toast} from "react-hot-toast";
import lodash from "lodash";

import {config_path} from "@common/const/app-config";
import ByteSize from "@common/const/byte-size";
import {CreatedDirectoryReplyMessage, JobCompletedReplyMessage} from "@common/ipc-actions/upload";

import {useI18n} from "@renderer/modules/i18n";
import {LogLevel} from "@renderer/modules/local-logger";
import {useAuth} from "@renderer/modules/auth";
import {appPreferences, useEndpointConfig} from "@renderer/modules/user-config-store";

import {JOB_NUMS_PER_QUERY, QUERY_INTERVAL} from "./const";
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

  const {currentUser, shareSession} = useAuth();

  const {
    endpointConfigData,
  } = useEndpointConfig(currentUser, shareSession);

  const {
    data: appPreferencesData,
  } = useSyncExternalStore(
    appPreferences.store.subscribe,
    appPreferences.store.getSnapshot,
  );

  // upload state
  const {
    jobState: uploadJobState,
    setJobsQuery: setUploadJobsQuery,
    setQueryCount: setUploadQueryCount,
  } = useIpcUpload({
    endpoint: endpointConfigData,
    user: currentUser,
    config: {
      resumable: appPreferencesData.resumeUploadEnabled,
      maxConcurrency: appPreferencesData.maxUploadConcurrency,
      multipartSize: appPreferencesData.multipartUploadPartSize * ByteSize.MB,
      multipartConcurrency: appPreferencesData.multipartUploadConcurrency,
      multipartThreshold: appPreferencesData.multipartUploadThreshold * ByteSize.MB,
      speedLimit: appPreferencesData.uploadSpeedLimitEnabled
        ? appPreferencesData.uploadSpeedLimitKbPerSec * ByteSize.KB
        : 0,
      isDebug: appPreferencesData.logLevel === LogLevel.Debug,
      isSkipEmptyDirectory: appPreferencesData.skipEmptyDirectoryUpload,
      persistPath: path.resolve(
        config_path,
        `profile_${currentUser?.accessKey ?? "kodo-browser"}`,
        "upload_prog",
      ),
      // userNatureLanguage needs mid-dash but i18n using lo_dash
      // @ts-ignore
      userNatureLanguage: currentLanguage.replace("_", "-"),
    },
    onAddedJobs: ({erroredFilePathnameList}) => {
      if (erroredFilePathnameList.length) {
        toast.error(translate("transfer.upload.hint.addedJobsErrored"));
      } else {
        toast.success(translate("transfer.upload.hint.addedJobs"));
      }
      setOpenPanelName(PanelName.Upload);
    },
    onJobCompleted: ({jobUiData}) => onUploadJobComplete(jobUiData),
    onCreatedDirectory: (data) => onCreatedDirectory(data),
  });

  const uploadProgressText = `${uploadJobState?.finished ?? 0}/${uploadJobState?.total ?? 0}`

  const handleLoadMoreUploadJobs = useCallback(lodash.debounce(() => {
    setUploadQueryCount(v => v + JOB_NUMS_PER_QUERY);
  }, QUERY_INTERVAL, {leading: true, trailing: false}), []);

  // download state
  const {
    jobState: downloadJobState,
    setJobsQuery: setDownloadJobsQuery,
    setQueryCount: setDownloadQueryCount,
  } = useIpcDownload({
    endpoint: endpointConfigData,
    user: currentUser,
    config: {
      resumable: appPreferencesData.resumeDownloadEnabled,
      maxConcurrency: appPreferencesData.maxDownloadConcurrency,
      multipartSize: appPreferencesData.multipartDownloadPartSize * ByteSize.MB,
      multipartThreshold: appPreferencesData.multipartDownloadThreshold * ByteSize.MB,
      speedLimit: appPreferencesData.downloadSpeedLimitEnabled
        ? appPreferencesData.downloadSpeedLimitKbPerSec * ByteSize.KB
        : 0,
      isDebug: appPreferencesData.logLevel === LogLevel.Debug,
      isOverwrite: appPreferencesData.overwriteDownloadEnabled,
      persistPath: path.resolve(
        config_path,
        `profile_${currentUser?.accessKey ?? "kodo-browser"}`,
        "download_prog",
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

  const downloadProgressText = `${downloadJobState?.finished ?? 0}/${downloadJobState?.total ?? 0}`

  const handleLoadMoreDownloadJobs = useCallback(lodash.debounce(() => {
    setDownloadQueryCount(v => v + JOB_NUMS_PER_QUERY);
  }, QUERY_INTERVAL, {leading: true, trailing: false}), []);

  // reset ipc jobs number for save performance
  useEffect(() => {
    if (!openPanelName) {
      setUploadQueryCount(0);
      setDownloadQueryCount(0);
    } else {
      setUploadQueryCount(JOB_NUMS_PER_QUERY);
      setDownloadQueryCount(JOB_NUMS_PER_QUERY);
    }
  }, [openPanelName]);

  // render
  if (!openPanelName) {
    return (
      <div
        className="transfer-panel-bar d-flex justify-content-around bg-body"
      >
        <div
          className="text-link me-2"
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
          {
            uploadJobState &&
            <UploadPanel
              stopped={uploadJobState.stopped}
              failed={uploadJobState.failed}
              data={uploadJobState.list}
              hasMore={uploadJobState.hasMore}
              onLoadMore={handleLoadMoreUploadJobs}
              onChangeSearchQuery={setUploadJobsQuery}
            />
          }
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
          {
            downloadJobState &&
            <DownloadPanel
              stopped={downloadJobState.stopped}
              failed={downloadJobState.failed}
              data={downloadJobState.list}
              hasMore={downloadJobState.hasMore}
              onLoadMore={handleLoadMoreDownloadJobs}
              onChangeSearchQuery={setDownloadJobsQuery}
            />
          }
        </Tab>
      </Tabs>
    </div>
  );
};

export default TransferPanel;
