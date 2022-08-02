import fs from "fs";
import path from "path";
import { ipcRenderer } from "electron";
import angular from "angular"

import ByteSize from "@common/const/byte-size";
import { UploadAction } from "@common/ipc-actions/upload";

import webModule from '@/app-module/web'

import * as AuthInfo from '@/components/services/authinfo';
import Settings from '@/components/services/settings';
import safeApply from '@/components/services/safe-apply';
import ipcUploadManager from '@/components/services/ipc-upload-manager';

import NgConfig from '@/ng-config'
import { TOAST_FACTORY_NAME as Toast } from '@/components/directives/toast-list'
import {
  EMPTY_FOLDER_UPLOADING,
  OVERWRITE_DOWNLOADING,
} from '@/const/setting-keys'
import * as AuditLog from '@/components/services/audit-log'

// import dependent controllers
import './downloads'
import './uploads'

import './frame.css'
import {Status} from "@common/models/job/types";
import ipcDownloadManager from "@/components/services/ipc-download-manager";
import {DownloadAction} from "@common/ipc-actions/download";

const TRANSFER_FRAME_CONTROLLER_NAME = 'transferFrameCtrl'

webModule.controller(TRANSFER_FRAME_CONTROLLER_NAME, [
  "$scope",
  "$translate",
  safeApply,
  NgConfig,
  Toast,
  function (
    $scope,
    $translate,
    safeApply,
    ngConfig,
    Toast,
  ) {
    const T = $translate.instant;
    let uploaderTimer;
    let downloaderTimer;

    angular.extend($scope, {
      transTab: 1,

      transSearch: {
        uploadJob: "",
        downloadJob: "",
      },

      lists: {
        uploadJobList: [],
        uploadJobListLimit: 100,
        downloadJobList: [],
        downloadJobListLimit: 100,
      },
      emptyFolderUploading: {
        enabled: localStorage.getItem(EMPTY_FOLDER_UPLOADING) !== null
          ? localStorage.getItem(EMPTY_FOLDER_UPLOADING) === "true"
          : true,
      },
      overwriteDownloading: {
        enabled: localStorage.getItem(OVERWRITE_DOWNLOADING) === "true" || false,
      },

      totalStat: {
        running: 0,
        total: 0,

        // upload
        up: 0,
        upRunning: 0,
        upDone: 0,
        upStopped: 0,
        upFailed: 0,

        // download
        down: 0,
        downRunning: 0,
        downDone: 0,
        downStopped: 0,
        downFailed: 0
      },
    });

    // functions in parent scope
    $scope.handlers.uploadFilesHandler = uploadFilesHandler;
    $scope.handlers.downloadFilesHandler = downloadFilesHandler;

    initUploaderIpc();
    initDownloaderIpc();

    $scope.$on('$destroy', () => {
      clearInterval(uploaderTimer);
      clearInterval(downloaderTimer);
    });

    // init Uploader IPC
    function initUploaderIpc() {
      ipcRenderer.on("UploaderManager-reply", (_event, message) => {
        safeApply($scope, () => {
          switch (message.action) {
            case UploadAction.UpdateUiData: {
              $scope.lists.uploadJobList = message.data.list;
              $scope.totalStat.up = message.data.total;
              $scope.totalStat.upDone = message.data.finished;
              $scope.totalStat.upFailed = message.data.failed;
              $scope.totalStat.upStopped = message.data.stopped;
              break;
            }
            case UploadAction.AddedJobs: {
              Toast.info(T("upload.addtolist.success"));
              $scope.transTab = 1;
              $scope.toggleTransVisible(true);
              AuditLog.log(
                  AuditLog.Action.UploadFilesStart,
                  {
                    regionId: message.data.destInfo.regionId,
                    bucket: message.data.destInfo.bucketName,
                    to: message.data.destInfo.key,
                    from: message.data.filePathnameList,
                  },
              );
              break;
            }
            case UploadAction.JobCompleted: {
              const parentDirectoryKey = message.data.jobUiData.to.key
                .split("/")
                .slice(0, -1)
                .reduce((r, p) => r + p + "/", "");
              if (
                $scope.currentInfo.bucketName === message.data.jobUiData.to.bucket &&
                $scope.currentInfo.key === parentDirectoryKey
              ) {
                $scope.$emit('refreshFilesList');
              }
              break;
            }
            case UploadAction.CreatedDirectory: {
              const parentDirectoryKey = message.data.directoryKey
                  .split("/")
                  .slice(0, -2)
                  .reduce((r, p) => r + p + "/", "");
              if (
                  $scope.currentInfo.bucketName === message.data.bucket &&
                  $scope.currentInfo.key === parentDirectoryKey
              ) {
                $scope.$emit('refreshFilesList');
              }
              break;
            }
            default: {
              console.warn("renderer received unknown/unhandled action, message:", message);
            }
          }
        });
      });
      ipcUploadManager.updateConfig({
        resumable: Settings.resumeUpload !== 0,
        maxConcurrency: Settings.maxUploadConcurrency,
        multipartSize: Settings.multipartUploadSize * ByteSize.MB,
        multipartThreshold: Settings.multipartUploadThreshold * ByteSize.MB,
        speedLimit: Settings.uploadSpeedLimitEnabled === 0
            ? 0
            : Settings.uploadSpeedLimitKBperSec * ByteSize.KB,
        isDebug: Settings.isDebug !== 0,
        isSkipEmptyDirectory: !$scope.emptyFolderUploading.enabled,
        persistPath: getProgFilePath(),
      });
      ipcUploadManager.loadPersistJobs({
        clientOptions: {
          accessKey: AuthInfo.get().id,
          secretKey: AuthInfo.get().secret,
          ucUrl: ngConfig.load().ucUrl || "",
          regions: ngConfig.load().regions || [],
        },
        uploadOptions: {
          userNatureLanguage: localStorage.getItem("lang") || "zh-CN",
        },
      });
      uploaderTimer = setInterval(() => {
        let query;
        if ($scope.transSearch.uploadJob) {
          if (Object.values(Status).includes($scope.transSearch.uploadJob.trim())) {
            query = {
              status: $scope.transSearch.uploadJob.trim(),
            };
          } else {
            query = {
              name: $scope.transSearch.uploadJob.trim(),
            };
          }
        }
        ipcUploadManager.updateUiData({
          pageNum: 0,
          count: $scope.lists.uploadJobListLimit,
          query: query,
        });
      }, 1000);

      function getProgFilePath() {
        const folder = Global.config_path;
        if (!fs.existsSync(folder)) {
          fs.mkdirSync(folder);
        }

        const username = AuthInfo.get().id || "kodo-browser";
        return path.join(folder, "upprog_" + username + ".json");
      }
    }

    /**
     * upload
     * @param {string[]} filePaths iter for folder
     * @param {object} bucketInfo
     *   @param {string} bucketInfo.bucketName
     *   @param {string} bucketInfo.regionId
     *   @param {string} bucketInfo.key
     *   @param {string} bucketInfo.qiniuBackendMode
     *   @param {object[]} bucketInfo.availableStorageClasses
     * @param {object} uploadOptions
     *   @param {string} uploadOptions.isOverwrite
     *   @param {string} uploadOptions.storageClassName storageClassName is fetched from server
     */
    function uploadFilesHandler(filePaths, bucketInfo,uploadOptions) {
      Toast.info(T("upload.addtolist.on"));
      ipcUploadManager.addJobs({
        filePathnameList: filePaths,
        destInfo: {
          bucketName: bucketInfo.bucketName,
          key: bucketInfo.key,
          regionId: bucketInfo.regionId,
        },
        uploadOptions: {
          isOverwrite: uploadOptions.isOverwrite,
          storageClassName: uploadOptions.storageClassName,
          storageClasses: bucketInfo.availableStorageClasses,
          userNatureLanguage: localStorage.getItem('lang') || 'zh-CN',
        },
        clientOptions: {
          accessKey: AuthInfo.get().id,
          secretKey: AuthInfo.get().secret,
          ucUrl: ngConfig.load().ucUrl || "",
          regions: ngConfig.load().regions || [],
          backendMode: bucketInfo.qiniuBackendMode,
        },
      });
    }

    function initDownloaderIpc() {
      ipcRenderer.on("DownloaderManager-reply", (_event, message) => {
        safeApply($scope, () => {
          switch (message.action) {
            case DownloadAction.UpdateUiData: {
              $scope.lists.downloadJobList = message.data.list;
              $scope.totalStat.down = message.data.total;
              $scope.totalStat.downDone = message.data.finished;
              $scope.totalStat.downStopped = message.data.stopped;
              $scope.totalStat.downFailed = message.data.failed;
              break;
            }
            case DownloadAction.AddedJobs: {
              Toast.info(T("download.addtolist.success"));
              $scope.transTab = 2;
              $scope.toggleTransVisible(true);

              AuditLog.log(
                  AuditLog.Action.DownloadFilesStart,
                  {
                    from: message.data.remoteObjects.map((remoteObject) => {
                      return {
                        regionId: remoteObject.region,
                        bucket: remoteObject.bucketName,
                        path: remoteObject.key,
                      };
                    }),
                    to: message.data.destPath,
                  },
              );
              break;
            }
          }
        });
      });
      ipcDownloadManager.updateConfig({
        resumable: Settings.resumeDownload !== 0,
        maxConcurrency: Settings.maxDownloadConcurrency,
        multipartSize: Settings.multipartDownloadSize * ByteSize.MB,
        multipartThreshold: Settings.multipartDownloadThreshold * ByteSize.MB,
        speedLimit: Settings.downloadSpeedLimitEnabled === 0
          ? 0
          : Settings.downloadSpeedLimitKBperSec * ByteSize.KB,
        isDebug: Settings.isDebug !== 0,
        isOverwrite: $scope.overwriteDownloading.enabled,
        persistPath: getProgFilePath(),
      });
      ipcDownloadManager.loadPersistJobs({
        clientOptions: {
          accessKey: AuthInfo.get().id,
          secretKey: AuthInfo.get().secret,
          ucUrl: ngConfig.load().ucUrl || "",
          regions: ngConfig.load().regions || [],
        },
        downloadOptions: {
          userNatureLanguage: localStorage.getItem("lang") || "zh-CN",
        },
      });
      downloaderTimer = setInterval(() => {
        let query;
        if ($scope.transSearch.downloadJob) {
          if (Object.values(Status).includes($scope.transSearch.downloadJob.trim())) {
            query = {
              status: $scope.transSearch.downloadJob.trim(),
            };
          } else {
            query = {
              name: $scope.transSearch.downloadJob.trim(),
            };
          }
        }
        ipcDownloadManager.updateUiData({
          pageNum: 0,
          count: $scope.lists.downloadJobListLimit,
          query: query,
        })
      }, 1000);

      function getProgFilePath() {
        const folder = Global.config_path;
        if (!fs.existsSync(folder)) {
          fs.mkdirSync(folder);
        }

        const username = AuthInfo.get().id || "kodo-browser";
        return path.join(folder, "downprog_" + username + ".json");
      }
    }

    /**
     * download
     * @param {object[]} fromRemotePath
     * @param {string} fromRemotePath.bucket
     * @param {string} fromRemotePath.region
     * @param {string} fromRemotePath.name
     * @param {number} [fromRemotePath.size]
     * @param {Date} [fromRemotePath.lastModified]
     * @param {object} fromRemotePath.path
     *   @param {boolean} fromRemotePath.path.isDir
     *   @param {string[]} fromRemotePath.path.dirSegments
     *   @param {string} fromRemotePath.path.sep
     * @param {object} fromRemotePath.domain
     *   @param {string} fromRemotePath.domain.region
     *   @param {string} fromRemotePath.domain.bucket
     * @param {string} fromRemotePath[].qiniuBackendMode
     * @param {string} toLocalPath
     * @param {object} bucketInfo
     *   @param {object[]} bucketInfo.availableStorageClasses
     *   @param {string} bucketInfo.regionId
     *   @param {string} bucketInfo.qiniuBackendMode
     *   @param {string} bucketInfo.bucketName
     *   @param {string} bucketInfo.bucketId
     */
    function downloadFilesHandler(fromRemotePath, toLocalPath, bucketInfo) {
      Toast.info(T("download.addtolist.on"));

      const remoteObjects = fromRemotePath.map(item => {
        // key
        let key = item.path.dirSegments.join(item.path.sep);
        if (item.path.isDir) {
          key += "/";
        } else if (key) {
          key += `/${item.name}`;
        } else {
          key = item.name;
        }

        // result
        return {
          region: item.region,
          bucket: item.bucket,
          key: key,
          name: item.name,
          size: item.path.isDir ? 0 : item.size,
          mtime: item.path.isDir ? 0 : item.lastModified,
          isDirectory: item.path.isDir,
          isFile: !item.path.isDir,
        };
      });
      ipcDownloadManager.addJobs({
        remoteObjects: remoteObjects,
        destPath: toLocalPath.toString(),
        downloadOptions: {
          region: bucketInfo.regionId,
          bucket: bucketInfo.bucketName,
          domain: $scope.selectedDomain.domain.toQiniuDomain(),
          isOverwrite: $scope.overwriteDownloading.enabled,
          storageClasses: bucketInfo.availableStorageClasses,
          userNatureLanguage: localStorage.getItem('lang') || 'zh-CN',
        },
        clientOptions: {
          accessKey: AuthInfo.get().id,
          secretKey: AuthInfo.get().secret,
          ucUrl: ngConfig.load().ucUrl || "",
          regions: ngConfig.load().regions || [],
          backendMode: $scope.selectedDomain.domain.qiniuBackendMode(),
        },
      });
    }
  }
]);

export default TRANSFER_FRAME_CONTROLLER_NAME
