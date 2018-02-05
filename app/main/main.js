angular.module("web").controller("mainCtrl", [
  "$scope",
  "$rootScope",
  "$timeout",
  "$state",
  "$q",
  "Const",
  "AuthInfo",
  "autoUpgradeSvs",
  function(
    $scope,
    $rootScope,
    $timeout,
    $state,
    $q,
    Const,
    AuthInfo,
    autoUpgradeSvs
  ) {
    angular.extend($scope, {
      upgradeInfo: {
        isLastVersion: true
      }
    });

    $timeout(function() {
      autoUpgradeSvs.load(function(info) {
        angular.extend($scope.upgradeInfo, info);
      });
    }, 2000);
  }
]);
