"use strict";

angular.module("web").controller("aboutCtrl", [
  "$scope",
  "$state",
  "$uibModalInstance",
  "$interval",
  "autoUpgradeSvs",
  "safeApply",
  "pscope",
  function (
    $scope,
    $state,
    $modalInstance,
    $interval,
    autoUpgradeSvs,
    safeApply,
    pscope
  ) {
    angular.extend($scope, {
      app_logo: Global.app.logo,
      app_version: Global.app.version,
      custom_about_html: Global.about_html,

      open: open,
      tryToOpenUpgradePackage: tryToOpenUpgradePackage,
      startUpgrade: startUpgrade,
      cancel: cancel
    });

    $interval(function () {
      Object.assign($scope.info, pscope.upgradeInfo);
    }, 1000);

    init();

    const fs = require('fs');

    function init() {
      $scope.info = pscope.upgradeInfo;

      if (!$scope.info.isLastVersion) {
        var converter = new showdown.Converter();
        autoUpgradeSvs.getLastestReleaseNote($scope.info.lastVersion, function (text) {
          text = text + "";

          var html = converter.makeHtml(text);

          $scope.info.lastReleaseNote = html;
        });
      }
    }

    function open(a) {
      openExternal(a);
    }

    function tryToOpenUpgradePackage(localPath) {
      if (fs.existsSync(localPath)) {
        open(`file://${localPath}`);
      } else {
        startUpgrade();
      }
    }

    function startUpgrade() {
      autoUpgradeSvs.start();
    }

    function cancel() {
      $modalInstance.dismiss("close");
    }
  }
]);
