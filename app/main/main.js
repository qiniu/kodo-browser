angular.module("web").controller("mainCtrl", [
  "$scope",
  "$timeout",
  "AuthInfo",
  "autoUpgradeSvs",
  function (
    $scope,
    $timeout,
    AuthInfo,
    autoUpgradeSvs
  ) {
    var authInfo = AuthInfo.get();
    if (authInfo) {
      var {
        ipcRenderer
      } = require("electron");
      ipcRenderer.send("asynchronous", {
        key: "AuthInfo",
        data: authInfo
      });
    }

    angular.extend($scope, {
      upgradeInfo: {
        isLastVersion: true
      }
    });

    $timeout(function () {
      autoUpgradeSvs.load(function (info) {
        angular.extend($scope.upgradeInfo, info);
      });
    }, 2000);
  }
]);