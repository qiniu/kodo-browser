"use strict";

angular.module("web").controller("settingsCtrl", [
  "$scope",
  "$state",
  "$timeout",
  "$uibModalInstance",
  "$translate",
  "callback",
  "settingsSvs",
  "Mailer",
  "Toast",
  "Dialog",
  function (
    $scope,
    $state,
    $timeout,
    $modalInstance,
    $translate,
    callback,
    settingsSvs,
    Mailer,
    Toast,
    Dialog
  ) {
    var T = $translate.instant;

    angular.extend($scope, {
      set: {
        isDebug: settingsSvs.isDebug.get(),
        useElectronNode: settingsSvs.useElectronNode.get(),
        autoUpgrade: settingsSvs.autoUpgrade.get(),
        resumeUpload: settingsSvs.resumeUpload.get(),
        maxUploadConcurrency: settingsSvs.maxUploadConcurrency.get(),
        multipartUploadThreshold: settingsSvs.multipartUploadThreshold.get(),
        multipartUploadSize: settingsSvs.multipartUploadSize.get(),
        resumeDownload: settingsSvs.resumeDownload.get(),
        maxDownloadConcurrency: settingsSvs.maxDownloadConcurrency.get(),
        multipartDownloadThreshold: settingsSvs.multipartDownloadThreshold.get(),
        multipartDownloadSize: settingsSvs.multipartDownloadSize.get()
      },
      setChange: setChange,
      cancel: cancel
    });

    var tid;

    function setChange(form1, key, ttl) {
      if (!$scope.set[key]) {
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
