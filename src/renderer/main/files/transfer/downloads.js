import angular from "angular"

import webModule from '@/app-module/web'
import ipcDownloadManager from "@/components/services/ipc-download-manager";
import jobUtil from '@/components/services/job-util'
import { TOAST_FACTORY_NAME as Toast } from '@/components/directives/toast-list'
import { OVERWRITE_DOWNLOADING } from '@/const/setting-keys'
import { DIALOG_FACTORY_NAME as Dialog} from '@/components/services/dialog.s'

const TRANSFER_DOWNLOADS_CONTROLLER_NAME = 'transferDownloadsCtrl'

webModule.controller(TRANSFER_DOWNLOADS_CONTROLLER_NAME, [
  "$scope",
  "$timeout",
  "$translate",
  jobUtil,
  Toast,
  Dialog,
  function (
    $scope,
    $timeout,
    $translate,
    jobUtil,
    Toast,
    Dialog
  ) {
    var T = $translate.instant;

    angular.extend($scope, {
      triggerOverwriting: triggerOverwriting,
      showRemoveItem: showRemoveItem,
      clearAllCompleted: clearAllCompleted,
      clearAll: clearAll,
      stopAll: stopAll,
      startAll: startAll,
      stopItem: stopItem,
      checkStartJob: checkStartJob,

      loadMoreDownloadItems: loadMoreItems
    });

    function loadMoreItems() {
      const len = $scope.totalStat.down;
      if ($scope.lists.downloadJobListLimit < len) {
        $scope.lists.downloadJobListLimit += Math.min(100, len - $scope.lists.uploadJobListLimit);
      }
    }

    function triggerOverwriting() {
      $scope.overwriteDownloading.enabled = !$scope.overwriteDownloading.enabled;
      localStorage.setItem(OVERWRITE_DOWNLOADING, $scope.overwriteDownloading.enabled);
      ipcDownloadManager.updateConfig({
        isOverwrite: $scope.overwriteDownloading.enabled,
      });
    }

    function stopItem(item) {
      ipcDownloadManager.stopJob({
        jobId: item.id,
      });
    }

    function checkStartJob(item) {
      ipcDownloadManager.waitJob({
        jobId: item.id,
      });
    }

    function showRemoveItem(item) {
      if (item.status === "finished") {
        doRemove(item);
      } else {
        const title = T("remove.from.list.title"); //'从列表中移除'
        const message = T("remove.from.list.message"); //'确定移除该下载任务?'
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
      ipcDownloadManager.removeJob({
        jobId: item.id,
      });
    }

    function clearAllCompleted() {
      ipcDownloadManager.cleanUpJobs();
    }

    function clearAll() {
      if (!$scope.lists.downloadJobList ||
        $scope.lists.downloadJobList.length === 0) {
        return;
      }

      const title = T("clear.all.title"); //清空所有
      const message = T("clear.all.download.message"); //确定清空所有下载任务?
      Dialog.confirm(
        title,
        message,
        (btn) => {
          if (btn) {
            ipcDownloadManager.removeAllJobs();
          }
        },
        1
      );
    }

    function stopAll() {
      Toast.info(T("pause.on")); //'正在暂停...'
      ipcDownloadManager.stopAllJobs();
      Toast.success(T("pause.success")); //'暂停成功'

      $timeout(() => {
        $scope.allActionBtnDisabled = false;
      });
    }

    function startAll() {
      $scope.allActionBtnDisabled = true;

      ipcDownloadManager.startAllJobs();

      $timeout(() => {
        $scope.allActionBtnDisabled = false;
      });
    }
  }
]);

export default TRANSFER_DOWNLOADS_CONTROLLER_NAME
