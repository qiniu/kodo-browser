import {ipcRenderer} from "electron";

import {DownloadActionFns} from "@common/ipc-actions/download";

const ipcDownloadManager = new DownloadActionFns(ipcRenderer, "DownloaderManager");

export default ipcDownloadManager;
