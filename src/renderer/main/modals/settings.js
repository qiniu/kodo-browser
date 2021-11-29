import angular from "angular"

import webModule from '../../app-module/web'

import settingsSvs from '../../components/services/settings'
import { TOAST_FACTORY_NAME as Toast} from '../../components/directives/toast-list'

const SETTINGS_CONTROLLER_NAME = 'settingsCtrl'

webModule.controller(SETTINGS_CONTROLLER_NAME, [
  "$scope",
  "$state",
  "$timeout",
  "$uibModalInstance",
  "$translate",
  "callback",
  settingsSvs,
  Toast,
  function (
    $scope,
    $state,
    $timeout,
    $modalInstance,
    $translate,
    callback,
    settingsSvs,
    Toast,
  ) {
    var T = $translate.instant;

    angular.extend($scope, {
      set: {
        isDebug: settingsSvs.isDebug.get(),
        autoUpgrade: settingsSvs.autoUpgrade.get(),
        resumeUpload: settingsSvs.resumeUpload.get(),
        maxUploadConcurrency: settingsSvs.maxUploadConcurrency.get(),
        multipartUploadThreshold: settingsSvs.multipartUploadThreshold.get(),
        multipartUploadSize: settingsSvs.multipartUploadSize.get(),
        uploadSpeedLimitEnabled: settingsSvs.uploadSpeedLimitEnabled.get(),
        uploadSpeedLimitKBperSec: settingsSvs.uploadSpeedLimitKBperSec.get(),
        resumeDownload: settingsSvs.resumeDownload.get(),
        maxDownloadConcurrency: settingsSvs.maxDownloadConcurrency.get(),
        multipartDownloadThreshold: settingsSvs.multipartDownloadThreshold.get(),
        multipartDownloadSize: settingsSvs.multipartDownloadSize.get(),
        downloadSpeedLimitEnabled: settingsSvs.downloadSpeedLimitEnabled.get(),
        downloadSpeedLimitKBperSec: settingsSvs.downloadSpeedLimitKBperSec.get(),
        externalPathEnabled: settingsSvs.externalPathEnabled.get(),
        stepByStepLoadingFiles: settingsSvs.stepByStepLoadingFiles.get(),
        filesLoadingSize: settingsSvs.filesLoadingSize.get(),
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
        settingsSvs[key].set($scope.set[key]);
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