import {UploadActionFns} from "@common/ipc-actions/upload";
import {ipcRenderer} from "electron";

const ipcUploadManager = new UploadActionFns(ipcRenderer, "UploaderManager");

export default ipcUploadManager;
