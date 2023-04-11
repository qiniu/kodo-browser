// Deprecate, will be replaced by local-logger

import fs from 'fs'
import path from 'path'

import moment from 'moment'

import * as AppConfig from '@common/const/app-config'

import {getCurrentUser} from "../auth";

const expirationMonths = 3;

export enum Action {
  Login = "login",
  Logout = "logout",
  SwitchAccount = "switchAccount",

  AddBucket = "addBucket",
  DeleteBucket = "deleteBucket",

  AddExternalPath = "addExternalPath",
  DeleteExternalPath = "deleteExternalPath",

  UploadFilesStart = "uploadFilesStart",
  DownloadFilesStart = "downloadFilesStart",
  AddFolder = "addFolder",
  DeleteFiles = "deleteFiles",
  DeleteFilesDone = "deleteFilesDone",
  MoveOrCopyFilesStart = "moveOrCopyFilesStart",
  MoveOrCopyFilesStartDone = "moveOrCopyFilesDone",
  MoveOrCopyFile = "moveOrCopyFile",
  RestoreFiles = "RestoreFiles",
  RestoreFilesDone = "RestoreFilesDone",
  SetStorageClassOfFiles = "setStorageClassOfFiles",
  SetStorageClassOfFilesDone = "setStorageClassOfFilesDone",
}

interface Params {
  // Account
  [Action.Login]: undefined,
  [Action.Logout]: {
    from: string,
  },
  [Action.SwitchAccount]: {
    from: string,
  },

  // Bucket
  [Action.AddBucket]: {
    regionId: string,
    name: string,
    acl: string,
  },
  [Action.DeleteBucket]: {
    regionId: string,
    name: string,
  },

  // ExternalPath
  [Action.AddExternalPath]: {
    regionId: string,
    path: string,
  },
  [Action.DeleteExternalPath]: {
    regionId: string,
    fullPath: string,
  },

  // File
  [Action.UploadFilesStart]: {
    regionId: string,
    bucket: string,
    from: string[],
    to: string,
  },
  [Action.DownloadFilesStart]: {
    regionId: string,
    bucket: string,
    from: string[],
    to: string,
  },
  [Action.AddFolder]: {
    regionId: string,
    bucket: string,
    path: string,
  },
  [Action.DeleteFiles]: {
    regionId: string,
    bucket: string,
    paths: string[],
  },
  [Action.DeleteFilesDone]: undefined,
  [Action.MoveOrCopyFilesStart]: {
    regionId: string
    from: {
      bucket: string,
      path: string,
    }[],
    to: {
      bucket: string,
      path: string,
    },
    type: 'copy' | 'move',
  },
  [Action.MoveOrCopyFilesStartDone]: undefined,
  [Action.MoveOrCopyFile]: {
    regionId: string,
    bucket: string,
    from: string,
    to: string,
    type: 'copy' | 'move',
    storageClass: string,
  },
  [Action.RestoreFiles]: {
    regionId: string,
    bucket: string,
    paths: string[],
    days: number,
  },
  [Action.RestoreFilesDone]: undefined,
  [Action.SetStorageClassOfFiles]: {
    regionId: string,
    bucket: string,
    paths: string[],
    updateTo: string,
  },
  [Action.SetStorageClassOfFilesDone]: undefined,
}

interface Options {
  logVersion?: number,
}

export function log<T extends Action>(
  action: T,
  ...args: (Params[T] extends undefined ? [undefined?, Options?] : [Params[T], Options?])
): void {
  const [params, options] = args;
  fs.appendFileSync(getFilePath(), JSON.stringify({
    time: new Date(),
    appVersion: AppConfig.app.version,
    logVersion: options?.logVersion ?? 1,
    accessKeyId: getCurrentUser()?.accessKey,
    action: action,
    params: params || {},
  }) + "\n");
}

function getFilePath() {
  const folderPath = path.join(AppConfig.config_path, 'logs');
  const logFilePath = path.join(folderPath, `audit_log_${moment().format('YYYY-MM')}.json`);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  if (!fs.existsSync(logFilePath)) {
    cleanLogs();
  }

  return logFilePath;
}

function cleanLogs() {
  const folderPath = path.join(AppConfig.config_path, 'logs');
  const now = moment();
  let entries = fs.readdirSync(folderPath, { withFileTypes: true });

  entries = entries.filter((entry) => {
    return entry.isFile() && entry.name.startsWith('audit_log_');
  });
  entries.forEach((entry) => {
    const momentRegexp = /^audit_log_(\d{4}-\d{2})\.json$/;
    const matchResult = entry.name.match(momentRegexp);
    if (matchResult) {
      if (now.diff(moment(matchResult[1], 'YYYY-MM')) > expirationMonths) {
        fs.unlinkSync(path.join(folderPath, entry.name));
      }
    }
  });
}
