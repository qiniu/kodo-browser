import {ipcRenderer, IpcRendererEvent} from "electron";

import {useEffect, useState} from "react";
import {NatureLanguage} from "kodo-s3-adapter-sdk/dist/uplog";

import {Status} from "@common/models/job/types";
import {
  AddedJobsReplyMessage,
  DownloadAction,
  DownloadReplyMessage,
  JobCompletedReplyMessage,
  UpdateUiDataReplyMessage
} from "@common/ipc-actions/download";

import {AkItem} from "@renderer/modules/auth";
import {Endpoint} from "@renderer/modules/qiniu-client";
import ipcDownloadManager from "@renderer/modules/electron-ipc-manages/ipc-download-manager";

import {JOB_NUMS_PER_QUERY, LAPSE_PER_QUERY} from "./const";
import ipcUploadManager from "@renderer/modules/electron-ipc-manages/ipc-upload-manager";

function handleOffline() {
  ipcDownloadManager.stopJobsByOffline();
}

function handleOnline() {
  ipcDownloadManager.startJobsByOnline();
}

interface DownloadConfig {
  resumable: boolean,
  maxConcurrency: number,
  multipartSize: number, // Bytes
  multipartThreshold: number, // Bytes
  speedLimit: number, // Bytes/s
  isDebug: boolean,
  isOverwrite: boolean,
  persistPath: string,

  // load persist jobs need below properties
  userNatureLanguage: NatureLanguage,
}

interface UseIpcDownloadProps {
  endpoint: Endpoint,
  user: AkItem | null,
  config: DownloadConfig,

  initQueryCount?: number,

  onAddedJobs?: (data: AddedJobsReplyMessage["data"]) => void,
  onJobCompleted?: (data: JobCompletedReplyMessage["data"]) => void,
}

const useIpcDownload = ({
  endpoint,
  user,
  config,

  initQueryCount = JOB_NUMS_PER_QUERY,

  onAddedJobs = () => {},
  onJobCompleted = () => {},
}: UseIpcDownloadProps) => {
  const [searchText, setSearchText] = useState<string>("");
  const [pageNum, setPageNum] = useState<number>(0);
  const [queryCount, setQueryCount] = useState<number>(initQueryCount);
  const [jobState, setJobState] = useState<UpdateUiDataReplyMessage["data"]>();


  // handle offline/online
  // the kodo-s3-adapter-sdk will take a long time to reconnect,
  // after network change in some network environment.
  // so handle it manually
  useEffect(() => {
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // auto update config
  const sortedConfigValues = Object.entries(config)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(item => item[1]);
  useEffect(() => {
    ipcUploadManager.updateConfig(config);
  }, sortedConfigValues);

  // subscribe IPC events of download and make sure there is a valid configuration
  useEffect(() => {
    const downloadReplyHandler = (_event: IpcRendererEvent, message: DownloadReplyMessage) => {
      switch (message.action) {
        case DownloadAction.UpdateUiData: {
          setJobState(message.data);
          break;
        }
        case DownloadAction.AddedJobs: {
          onAddedJobs(message.data);
          break;
        }
        case DownloadAction.JobCompleted: {
          onJobCompleted(message.data);
          break;
        }
      }
    };

    ipcRenderer.on("DownloaderManager-reply", downloadReplyHandler);

    return () => {
      ipcRenderer.off("DownloaderManager-reply", downloadReplyHandler);
    };
  }, []);

  // if user or endpoint changed, load persist jobs
  useEffect(() => {
    if (!user) {
      return;
    }
    ipcDownloadManager.loadPersistJobs({
      clientOptions: {
        accessKey: user.accessKey,
        secretKey: user.accessSecret,
        ucUrl: endpoint.ucUrl,
        regions: endpoint.regions.map(r => ({
          id: "",
          s3Id: r.identifier,
          label: r.label,
          s3Urls: [r.endpoint],
        })),
      },
      downloadOptions: {
        userNatureLanguage: config.userNatureLanguage,
      }
    });
  }, [user, endpoint]);

  // refreshing ui data need send event proactively.
  // this may be deprecated in the future.
  useEffect(() => {
    const downloaderTimer = setInterval(() => {
      let query;
      if (searchText) {
        const searchTextTrimmed = searchText.trim();
        if ((Object.values(Status) as string[]).includes(searchTextTrimmed)) {
          query = {
            status: searchTextTrimmed as Status,
          };
        } else {
          query = {
            name: searchTextTrimmed,
          };
        }
      }
      ipcDownloadManager.updateUiData({
        pageNum: pageNum,
        count: queryCount,
        query: query,
      });
    }, LAPSE_PER_QUERY);

    return () => {
      clearInterval(downloaderTimer);
    };
  }, [searchText, queryCount]);

  return {
    pageNum,
    queryCount,
    jobState,
    setSearchText,
    setPageNum,
    setQueryCount,
  }
};

export default useIpcDownload;
