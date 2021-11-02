import showdown from 'showdown'
import fs from 'fs'

import angular from 'angular'

import webModule from '../../app-module/web'

import autoUpgradeSvs from '../../components/services/auto-upgrade'
import safeApply from '../../components/services/safe-apply'

const ABOUT_CONTROLLER_NAME = "aboutCtrl"

webModule.controller(ABOUT_CONTROLLER_NAME, [
  "$scope",
  "$state",
  "$uibModalInstance",
  "$interval",
  autoUpgradeSvs,
  safeApply,
  "pscope", // parent scope, dynamic injection
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
      pauseUpgrade: pauseUpgrade,
      cancel: cancel
    });

    $interval(function () {
      Object.assign($scope.info, pscope.upgradeInfo);
    }, 1000);

    init();

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

    function pauseUpgrade() {
      autoUpgradeSvs.stop();
    }

    function cancel() {
      $modalInstance.dismiss("close");
    }
  }
]);

export default ABOUT_CONTROLLER_NAME
