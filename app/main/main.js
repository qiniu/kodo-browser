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
    autoUpgradeSvs.load(function(upgradeInfo) {
      $scope.upgradeInfo = upgradeInfo;
    });
  }
]);
