import {ipcRenderer, IpcRendererEvent} from "electron";

import {useEffect, useRef, useState} from "react";
import {NatureLanguage} from "kodo-s3-adapter-sdk/dist/uplog";

import {Status} from "@common/models/job/types";
import {
  AddedJobsReplyMessage,
  UploadAction,
  UploadReplyMessage,
  JobCompletedReplyMessage,
  UpdateUiDataReplyMessage,
  CreatedDirectoryReplyMessage,
} from "@common/ipc-actions/upload";

import {AkItem} from "@renderer/modules/auth";
import {Endpoint} from "@renderer/modules/qiniu-client";
import ipcUploadManager from "@renderer/modules/electron-ipc-manages/ipc-upload-manager";

import {JOB_NUMS_PER_QUERY, LAPSE_PER_QUERY} from "./const";

function handleOffline() {
  ipcUploadManager.stopJobsByOffline();
}

function handleOnline() {
  ipcUploadManager.startJobsByOnline();
}

interface UploadConfig {
  resumable: boolean,
  maxConcurrency: number,
  multipartSize: number, // Bytes
  multipartThreshold: number, // Bytes
  speedLimit: number, // Bytes/s
  isDebug: boolean,
  isSkipEmptyDirectory: boolean,
  persistPath: string,

  // load persist jobs need below properties
  userNatureLanguage: NatureLanguage,
}

interface UseIpcUploadProps {
  endpoint: Endpoint,
  user: AkItem | null,
  config: UploadConfig,

  initQueryCount?: number,

  onAddedJobs?: (data: AddedJobsReplyMessage["data"]) => void,
  onJobCompleted?: (data: JobCompletedReplyMessage["data"]) => void,
  onCreatedDirectory?: (data: CreatedDirectoryReplyMessage["data"]) => void,
}

const useIpcUpload = ({
  endpoint,
  user,
  config,

  initQueryCount = JOB_NUMS_PER_QUERY,

  onAddedJobs = () => {},
  onJobCompleted = () => {},
  onCreatedDirectory = () => {},
}: UseIpcUploadProps) => {
  const [searchText, setSearchText] = useState<string>("");
  const [pageNum, setPageNum] = useState<number>(0);
  const [queryCount, setQueryCount] = useState<number>(initQueryCount);
  const [jobState, setJobState] = useState<UpdateUiDataReplyMessage["data"]>();

  const uploadReplyHandlerRef = useRef<
    (_event: IpcRendererEvent, message: UploadReplyMessage) => void
  >();

  useEffect(() => {
    uploadReplyHandlerRef.current = (_event: IpcRendererEvent, message: UploadReplyMessage) => {
      switch (message.action) {
        case UploadAction.UpdateUiData: {
          setJobState(message.data);
          break;
        }
        case UploadAction.AddedJobs: {
          onAddedJobs(message.data);
          break;
        }
        case UploadAction.JobCompleted: {
          onJobCompleted(message.data);
          break;
        }
        case UploadAction.CreatedDirectory: {
          onCreatedDirectory(message.data);
          break;
        }
      }
    }
  }, [onAddedJobs, onJobCompleted, onCreatedDirectory]);

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

  // subscribe IPC events of upload and make sure there is a valid configuration
  useEffect(() => {
    const uploadReplyHandler =
      (event: IpcRendererEvent, message: UploadReplyMessage) => uploadReplyHandlerRef.current?.(event, message);
    ipcRenderer.on("UploaderManager-reply", uploadReplyHandler);
    ipcUploadManager.updateConfig(config);

    return () => {
      ipcRenderer.off("UploaderManager-reply", uploadReplyHandler);
    };
  }, []);

  // if user or endpoint changed, load persist jobs
  useEffect(() => {
    if (!user) {
      return;
    }
    ipcUploadManager.loadPersistJobs({
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
      uploadOptions: {
        userNatureLanguage: config.userNatureLanguage,
      }
    });
  }, [user, endpoint]);

  // refreshing ui data need send event proactively.
  // this may be deprecated in the future.
  useEffect(() => {
    const uploaderTimer = setInterval(() => {
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
      ipcUploadManager.updateUiData({
        pageNum: pageNum,
        count: queryCount,
        query: query,
      });
    }, LAPSE_PER_QUERY);

    return () => {
      clearInterval(uploaderTimer);
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

export default useIpcUpload;
