import webModule from '../app-module/web'

// import common controller
import './_'

import autoUpgradeSvs from '../components/services/auto-upgrade'

const MAIN_CONTROLLER_NAME = 'mainCtrl'

webModule.controller(MAIN_CONTROLLER_NAME, [
  "$scope",
  "$timeout",
  autoUpgradeSvs,
  function (
    $scope,
    $timeout,
    autoUpgradeSvs
  ) {
    angular.extend($scope, {
      upgradeInfo: {
        isLastVersion: true
      }
    });
    load();

    function load() {
      autoUpgradeSvs.load(function(upgradeInfo, success) {
        $scope.$apply(() => {
          $scope.upgradeInfo = upgradeInfo;
        });
        if (success) {
          $timeout(load, 86400 * 1000);
        } else {
          $timeout(load, 30 * 1000);
        }
      });
    }
  }
]);

export default MAIN_CONTROLLER_NAME
