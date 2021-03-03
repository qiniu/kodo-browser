angular.module("web").controller("topCtrl", [
  "$scope",
  "$rootScope",
  "$uibModal",
  "$location",
  "$translate",
  "$timeout",
  "Dialog",
  "Auth",
  "AuthInfo",
  "settingsSvs",
  "Toast",
  "Config",
  "autoUpgradeSvs",
  "AuditLog",
  function(
    $scope,
    $rootScope,
    $modal,
    $location,
    $translate,
    $timeout,
    Dialog,
    Auth,
    AuthInfo,
    settingsSvs,
    Toast,
    Config,
    autoUpgradeSvs,
    AuditLog
  ) {
    var fs = require("fs");
    var path = require("path");
    var T = $translate.instant;

    angular.extend($scope, {
      logout: logout,
      switchAccount: switchAccount,
      showBookmarks: showBookmarks,
      showAbout: showAbout,
      showReleaseNote: showReleaseNote,
      showBucketsOrFiles: showBucketsOrFiles,
      showExternalPaths: showExternalPaths,
      isExternalPathEnabled: isExternalPathEnabled,
      click10: click10
    });

    var ctime = 0;
    var tid;
    function click10() {
      ctime++;
      if (ctime > 10) {
        openDevTools();
      }
      $timeout.cancel(tid);
      tid = $timeout(function() {
        ctime = 0;
      }, 600);
    }

    $rootScope.app = {};
    angular.extend($rootScope.app, Global.app);

    $scope.authInfo = AuthInfo.get();
    $scope.authInfo.expirationStr = moment(
      new Date($scope.authInfo.expiration)
    ).format("YYYY-MM-DD HH:mm:ss");

    $scope.$watch("upgradeInfo.isLastVersion", function(v) {
      if (false === v) {
        if (1 == settingsSvs.autoUpgrade.get()) autoUpgradeSvs.start();
        else $scope.showAbout();
      }
    });
    $scope.$watch("upgradeInfo.upgradeJob.status", function(s) {
      if ("failed" == s || "finished" == s) {
        $scope.showAbout();
      }
    });

    $rootScope.showSettings = function(fn) {
      $modal.open({
        templateUrl: "main/modals/settings.html",
        controller: "settingsCtrl",
        resolve: {
          callback: function() {
            return fn;
          }
        }
      }).result.then(angular.noop, angular.noop);
    };

    function logout() {
      var title = T("logout");
      var message = T("logout.message");
      Dialog.confirm(
        title,
        message,
        function(b) {
          if (b) {
            const originalAccessKeyId = AuthInfo.get().id;
            Auth.logout().then(() => {
              AuditLog.log('logout', { from: originalAccessKeyId });
              $location.url("/login");
            }).catch((err) => {
              Toast.error(err.message, 5000);
              Dialog.alert(T('auth.logout.error.title'), T('auth.logout.error.description'), null, 1);
            });
          }
        },
        1
      );
    }

    function switchAccount() {
      $modal.open({
        templateUrl: "main/auth/modals/ak-histories-modal.html",
        controller: "akHistoriesModalCtrl",
        size: 'lg',
        resolve: {
          choose: function() {
            return function(history) {
              const originalAccessKeyId = AuthInfo.get().id;
              Auth.logout().then(
                function () {
                  const isPublicCloud = history.isPublicCloud;
                  Auth.login({
                    id: history.accessKeyId,
                    secret: history.accessKeySecret,
                    isPublicCloud: isPublicCloud
                  }).then(
                    function () {
                      if (isPublicCloud) {
                        AuthInfo.switchToPublicCloud();
                      } else {
                        AuthInfo.switchToPrivateCloud();
                      }
                      AuditLog.log('switchAccount', { from: originalAccessKeyId });
                      Toast.success(T("login.successfully"), 1000);
                      const { ipcRenderer } = require('electron');
                      ipcRenderer.send('asynchronous', { key: 'reloadWindow' });
                    },
                    function (err) {
                      Toast.error(err.message, 5000);
                      Dialog.alert(T('auth.switch.error.title'), T('auth.switch.error.description'), null, 1);
                    });
                },
                function (err) {
                  Toast.error(err.message, 5000);
                  Dialog.alert(T('auth.logout.error.title'), T('auth.logout.error.description'), null, 1);
                });
            }
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showReleaseNote() {
      var converter = new showdown.Converter();
      fs.readFile(
        path.join(__dirname, "release-notes", Global.app.version + ".md"),
        function(err, text) {
          if (err) {
            console.error(err);
            return;
          }
          text = text + "";
          var html = converter.makeHtml(text);
          var message = T("main.upgration"); //'主要更新'
          Dialog.alert(message, html, function() {}, { size: "lg" });
        }
      );
    }

    function showBookmarks() {
      $modal.open({
        templateUrl: "main/modals/bookmarks.html",
        controller: "bookmarksCtrl",
        size: "lg"
      }).result.then(angular.noop, angular.noop);
    }

    function showAbout() {
      $modal.open({
        templateUrl: "main/modals/about.html",
        controller: "aboutCtrl",
        size: "md",
        resolve: {
          pscope: function() {
            return $scope;
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function isExternalPathEnabled() {
      return settingsSvs.externalPathEnabled.get() > 0
    }

    function showBucketsOrFiles() {
      if (isExternalPathsView()) {
        $scope.gotoLocalMode();
      }
    }

    function showExternalPaths() {
      if (isBucketsOrFilesView()) {
        $scope.gotoExternalMode();
      }
    }

    function isBucketsOrFilesView() {
      return $scope.ref.mode.startsWith('local');
    }

    function isExternalPathsView() {
      return $scope.ref.mode.startsWith('external');
    }
  }
]);
