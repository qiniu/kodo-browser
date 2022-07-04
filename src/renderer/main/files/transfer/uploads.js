import angular from "angular"

import webModule from '@/app-module/web'
import ipcUploadManager from "@/components/services/ipc-upload-manager"
import jobUtil from '@/components/services/job-util'
import DelayDone from '@/components/services/delay-done'
import { TOAST_FACTORY_NAME as Toast } from '@/components/directives/toast-list'
import {
  EMPTY_FOLDER_UPLOADING,
} from '@/const/setting-keys'
import { DIALOG_FACTORY_NAME as Dialog } from '@/components/services/dialog.s'

const TRANSFER_UPLOAD_CONTROLLER_NAME = 'transferUploadsCtrl'

webModule.controller(TRANSFER_UPLOAD_CONTROLLER_NAME, [
  "$scope",
  "$timeout",
  "$translate",
  jobUtil,
  DelayDone,
  Toast,
  Dialog,
  function (
    $scope,
    $timeout,
    $translate,
    jobUtil,
    DelayDone,
    Toast,
    Dialog
  ) {
    const T = $translate.instant;

    angular.extend($scope, {
      triggerEmptyFolder: triggerEmptyFolder,
      stopItem: stopItem,
      showRemoveItem: showRemoveItem,
      clearAllCompleted: clearAllCompleted,
      clearAll: clearAll,
      stopAll: stopAll,
      startAll: startAll,
      checkStartJob: checkStartJob,

      loadMoreUploadItems: loadMoreItems
    });

    function loadMoreItems() {
      const len = $scope.totalStat.up;
      if ($scope.lists.uploadJobListLimit < len) {
        $scope.lists.uploadJobListLimit += Math.min(100, len - $scope.lists.uploadJobListLimit);
      }
    }

    function triggerEmptyFolder() {
      $scope.emptyFolderUploading.enabled = !$scope.emptyFolderUploading.enabled;
      localStorage.setItem(EMPTY_FOLDER_UPLOADING, $scope.emptyFolderUploading.enabled);
      ipcUploadManager.updateConfig({
        isSkipEmptyDirectory: !$scope.emptyFolderUploading.enabled,
      });
    }

    function checkStartJob(item, force) {
      if (force) {
        ipcUploadManager.startJob({
          jobId: item.id,
          forceOverwrite: force,
        });
      } else {
        ipcUploadManager.waitJob({
          jobId: item.id,
        });
      }
    }

    function stopItem(item) {
      ipcUploadManager.stopJob({
        jobId: item.id,
      });
    }

    function showRemoveItem(item) {
      if (item.status === "finished") {
        doRemove(item);
      } else {
        const title = T("remove.from.list.title"); //'从列表中移除'
        const message = T("remove.from.list.message"); //'确定移除该上传任务?'
        Dialog.confirm(
          title,
          message,
          (btn) => {
            if (btn) {
              doRemove(item);
            }
          },
          1
        );
      }
    }

    function doRemove(item) {
      ipcUploadManager.removeJob({
        jobId: item.id,
      });
    }

    function clearAllCompleted() {
      ipcUploadManager.cleanUpJobs();
    }

    function clearAll() {
      if (!$scope.lists.uploadJobList ||
        $scope.lists.uploadJobList.length === 0) {
        return;
      }

      const title = T("clear.all.title"); //清空所有
      const message = T("clear.all.upload.message"); //确定清空所有上传任务?
      Dialog.confirm(
        title,
        message,
        (btn) => {
          if (btn) {
            ipcUploadManager.removeAllJobs();
          }
        },
        1
      );
    }

    function stopAll() {
      Toast.info(T("pause.on")); //'正在暂停...'
      $scope.allActionBtnDisabled = true;

      ipcUploadManager.stopAllJobs()

      Toast.info(T("pause.success"));

      $timeout(function () {
        $scope.allActionBtnDisabled = false;
      }, 100);
    }

    function startAll() {
      $scope.allActionBtnDisabled = true;

      ipcUploadManager.startAllJobs()

      $timeout(function () {
        $scope.allActionBtnDisabled = false;
      }, 100);
    }
  }
]);

export default TRANSFER_UPLOAD_CONTROLLER_NAME
