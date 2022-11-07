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

  onAddedJobs?: (data: AddedJobsReplyMessage["data"]) => void,
  onJobCompleted?: (data: JobCompletedReplyMessage["data"]) => void,
}

const useIpcDownload = ({
  endpoint,
  user,
  config,

  onAddedJobs = () => {},
  onJobCompleted = () => {},
}: UseIpcDownloadProps) => {
  const [searchText, setSearchText] = useState<string>("");
  const [queryCount, setQueryCount] = useState<number>(100);
  const [jobState, setJobState] = useState<UpdateUiDataReplyMessage["data"]>();

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
    ipcDownloadManager.updateConfig(config);

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
        pageNum: 0,
        count: queryCount,
        query: query,
      });
    }, 1000);

    return () => {
      clearInterval(downloaderTimer);
    };
  }, [searchText, queryCount]);

  return {
    jobState,
    setSearchText,
    setQueryCount,
  }
};

export default useIpcDownload;
