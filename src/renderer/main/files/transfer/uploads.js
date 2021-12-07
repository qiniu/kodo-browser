import angular from "angular"

import webModule from '@/app-module/web'

import jobUtil from '@/components/services/job-util'
import DelayDone from '@/components/services/delay-done'
import UploadMgr from '@/components/services/upload-manager'
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
  UploadMgr,
  Toast,
  Dialog,
  function (
    $scope,
    $timeout,
    $translate,
    jobUtil,
    DelayDone,
    UploadMgr,
    Toast,
    Dialog
  ) {
    var T = $translate.instant;

    angular.extend($scope, {
      triggerEmptyFolder: triggerEmptyFolder,
      showRemoveItem: showRemoveItem,
      clearAllCompleted: clearAllCompleted,
      clearAll: clearAll,
      stopAll: stopAll,
      startAll: startAll,
      checkStartJob: checkStartJob,

      sch: {
        upname: null
      },
      schKeyFn: function (item) {
        return (
          item.options.from.name +
          " " +
          item.status +
          " " +
          jobUtil.getStatusLabel(item.status)
        );
      },
      limitToNum: 100,
      loadMoreUploadItems: loadMoreItems
    });

    function loadMoreItems() {
      var len = $scope.lists.uploadJobList.length;
      if ($scope.limitToNum < len) {
        $scope.limitToNum += Math.min(100, len - $scope.limitToNum);
      }
    }

    function triggerEmptyFolder() {
      $scope.emptyFolderUploading.enabled = !$scope.emptyFolderUploading.enabled;
      localStorage.setItem(EMPTY_FOLDER_UPLOADING, $scope.emptyFolderUploading.enabled);
    }

    function checkStartJob(item, force) {
      if (force) {
        item.start(true);
      } else {
        item.wait();
      }

      UploadMgr.trySchedJob();
    }

    function showRemoveItem(item) {
      if (item.status == "finished") {
        doRemove(item);
      } else {
        var title = T("remove.from.list.title"); //'从列表中移除'
        var message = T("remove.from.list.message"); //'确定移除该上传任务?'
        Dialog.confirm(
          title,
          message,
          (btn) => {
            if (btn) {
              if (item.status == "running" ||
                item.status == "waiting" ||
                item.status == "verifying" ||
                item.status == "duplicated") {
                item.stop();
              }

              doRemove(item);
            }
          },
          1
        );
      }
    }

    function doRemove(item) {
      var jobs = $scope.lists.uploadJobList;
      for (var i = 0; i < jobs.length; i++) {
        if (item === jobs[i]) {
          jobs.splice(i, 1);
          break;
        }
      }

      $timeout(() => {
        UploadMgr.trySaveProg();
        $scope.calcTotalProg();
      });
    }

    function clearAllCompleted() {
      var jobs = $scope.lists.uploadJobList;
      for (var i = 0; i < jobs.length; i++) {
        if ("finished" == jobs[i].status) {
          jobs.splice(i, 1);
          i--;
        }
      }

      $timeout(() => {
        $scope.calcTotalProg();
      });
    }

    function clearAll() {
      if (!$scope.lists.uploadJobList ||
        $scope.lists.uploadJobList.length == 0) {
        return;
      }

      var title = T("clear.all.title"); //清空所有
      var message = T("clear.all.upload.message"); //确定清空所有上传任务?
      Dialog.confirm(
        title,
        message,
        (btn) => {
          if (btn) {
            var jobs = $scope.lists.uploadJobList;
            for (var i = 0; i < jobs.length; i++) {
              var job = jobs[i];
              if (job.status == "running" ||
                job.status == "waiting" ||
                job.status == "verifying" ||
                job.status == "duplicated") {
                job.stop();
              }

              jobs.splice(i, 1);
              i--;
            }

            $timeout(() => {
              UploadMgr.trySaveProg();
              $scope.calcTotalProg();
            });
          }
        },
        1
      );
    }

    var stopFlag = false;

    function stopAll() {
      var arr = $scope.lists.uploadJobList;
      if (arr && arr.length > 0) {
        stopFlag = true;

        UploadMgr.stopCreatingJobs();

        Toast.info(T("pause.on")); //'正在暂停...'
        $scope.allActionBtnDisabled = true;

        angular.forEach(arr, function (n) {
          if (item.resumable && (
              n.status == "running" ||
              n.status == "waiting" ||
              n.status == "verifying"
            ))
            n.stop();
        });
        Toast.info(T("pause.success"));

        $timeout(function () {
          UploadMgr.trySaveProg();
          $scope.allActionBtnDisabled = false;
        }, 100);
      }
    }

    function startAll() {
      var arr = $scope.lists.uploadJobList;
      stopFlag = false;
      //串行
      if (arr && arr.length > 0) {
        $scope.allActionBtnDisabled = true;
        DelayDone.seriesRun(
          arr,
          function (n, fn) {
            if (stopFlag) {
              return;
            }

            if (n && (n.status == "stopped" || n.status == "failed")) {
              n.wait();
            }

            UploadMgr.trySchedJob();

            fn();
          },
          function doneFn() {
            $scope.allActionBtnDisabled = false;
          }
        );
      }
    }
  }
]);

export default TRANSFER_UPLOAD_CONTROLLER_NAME
