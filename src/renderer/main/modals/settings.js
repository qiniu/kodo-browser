import angular from "angular"

import webModule from '../../app-module/web'

import Settings from '../../components/services/settings.ts'
import { TOAST_FACTORY_NAME as Toast} from '../../components/directives/toast-list'

const SETTINGS_CONTROLLER_NAME = 'settingsCtrl'

webModule.controller(SETTINGS_CONTROLLER_NAME, [
  "$scope",
  "$state",
  "$timeout",
  "$uibModalInstance",
  "$translate",
  "callback",
  Toast,
  function (
    $scope,
    $state,
    $timeout,
    $modalInstance,
    $translate,
    callback,
    Toast,
  ) {
    var T = $translate.instant;

    angular.extend($scope, {
      set: {
        isDebug: Settings.isDebug,
        autoUpgrade: Settings.autoUpgrade,
        resumeUpload: Settings.resumeUpload,
        maxUploadConcurrency: Settings.maxUploadConcurrency,
        multipartUploadThreshold: Settings.multipartUploadThreshold,
        multipartUploadSize: Settings.multipartUploadSize,
        uploadSpeedLimitEnabled: Settings.uploadSpeedLimitEnabled,
        uploadSpeedLimitKBperSec: Settings.uploadSpeedLimitKBperSec,
        resumeDownload: Settings.resumeDownload,
        maxDownloadConcurrency: Settings.maxDownloadConcurrency,
        multipartDownloadThreshold: Settings.multipartDownloadThreshold,
        multipartDownloadSize: Settings.multipartDownloadSize,
        downloadSpeedLimitEnabled: Settings.downloadSpeedLimitEnabled,
        downloadSpeedLimitKBperSec: Settings.downloadSpeedLimitKBperSec,
        externalPathEnabled: Settings.externalPathEnabled,
        stepByStepLoadingFiles: Settings.stepByStepLoadingFiles,
        filesLoadingSize: Settings.filesLoadingSize,
      },
      setChange: setChange,
      cancel: cancel
    });

    var tid;

    function setChange(form1, key, ttl) {
      if (typeof $scope.set[key] === 'undefined') {
        return;
      }

      $timeout.cancel(tid);

      tid = $timeout(function () {
        Settings[key] = $scope.set[key];
        Toast.success(T("settings.success")); //已经保存设置
      }, ttl || 100);
    }

    function cancel() {
      if (callback) callback();

      $modalInstance.dismiss("close");
    }
  }
]);

export default SETTINGS_CONTROLLER_NAME
