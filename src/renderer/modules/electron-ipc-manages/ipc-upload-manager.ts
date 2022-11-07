import {ipcRenderer} from "electron";

import {UploadActionFns} from "@common/ipc-actions/upload";

const ipcUploadManager = new UploadActionFns(ipcRenderer, "UploaderManager");

export default ipcUploadManager;
