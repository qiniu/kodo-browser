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

    // $timeout(function () {
    //   autoUpgradeSvs.load(function (info) {
    //     angular.extend($scope.upgradeInfo, info);
    //   });
    // }, 2000);
  }
]);