angular.module("web").controller("mainCtrl", [
  "$scope",
  "$timeout",
  "autoUpgradeSvs",
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
