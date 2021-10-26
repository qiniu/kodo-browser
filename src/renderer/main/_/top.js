import fs from 'fs'
import path from 'path'

import angular from "angular"
import { ipcRenderer } from 'electron'
import moment from 'moment'

import webModule from '@/app-module/web'

import { DIALOG_FACTORY_NAME as Dialog } from '@/components/services/dialog.s'
import Auth from '@/components/services/auth'
import * as AuthInfo from '@/components/services/authinfo'
import Settings from '@/components/services/settings'
import { TOAST_FACTORY_NAME as Toast } from "@/components/directives/toast-list"
import NgConfig from '@/ng-config'
import autoUpgradeSvs from '@/components/services/auto-upgrade'
import * as AuditLog from "@/components/services/audit-log"

import { aboutHtmlMapping, bookmarksHtmlMapping, settingsHtmlMapping } from "@template-mappings/main/modals"
import settingsCtrl from '../modals/settings'
import bookmarksCtrl from '../modals/bookmarks'
import aboutCtrl from '../modals/about'

import { akHistoriesModalHtmlMapping } from '@template-mappings/main/auth/modals'
import akHistoriesModalCtrl from '../auth/modals/ak-histories-modal'

import './top.css'

const TOP_CONTROLLER_NAME = 'topCtrl'

webModule.controller(TOP_CONTROLLER_NAME, [
  "$scope",
  "$rootScope",
  "$uibModal",
  "$location",
  "$translate",
  "$timeout",
  Dialog,
  Auth,
  Toast,
  NgConfig,
  autoUpgradeSvs,
  function(
    $scope,
    $rootScope,
    $modal,
    $location,
    $translate,
    $timeout,
    Dialog,
    Auth,
    Toast,
    Config,
    autoUpgradeSvs,
  ) {
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
        if (1 === Settings.autoUpgrade) autoUpgradeSvs.start();
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
        templateUrl: settingsHtmlMapping.path,
        controller: settingsCtrl,
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
              AuditLog.log(
                AuditLog.Action.Logout,
                { from: originalAccessKeyId },
              );
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
        templateUrl: akHistoriesModalHtmlMapping.path,
        controller: akHistoriesModalCtrl,
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
                      AuditLog.log(
                        AuditLog.Action.SwitchAccount,
                        { from: originalAccessKeyId },
                      );
                      Toast.success(T("login.successfully"), 1000);
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
        templateUrl: bookmarksHtmlMapping.path,
        controller: bookmarksCtrl,
        size: "lg"
      }).result.then(angular.noop, angular.noop);
    }

    function showAbout() {
      $modal.open({
        templateUrl: aboutHtmlMapping.path,
        controller: aboutCtrl,
        size: "md",
        resolve: {
          pscope: function() {
            return $scope;
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function isExternalPathEnabled() {
      return Settings.externalPathEnabled > 0
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

export default TOP_CONTROLLER_NAME
