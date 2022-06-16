import { dialog as electronDialog } from '@electron/remote'

import webModule from '../../app-module/web'

import { dialogHtmlMapping } from "@template-mappings/components/services"

export const DIALOG_FACTORY_NAME = 'Dialog'
export const ALERT_DIALOG_CONTROLLER_NAME = 'alertDialogCtrl'
export const CONFIRM_DIALOG_CONTROLLER_NAME = 'confirmDialogCtrl'

webModule
  .factory(DIALOG_FACTORY_NAME, [
    "$uibModal",
    function ($modal) {
      return {
        alert: alert,
        confirm: confirm,

        showUploadDialog: showUploadDialog,
        showDownloadDialog: showDownloadDialog
      };

      function showUploadDialog(fn) {
        var isMac = navigator.userAgent.indexOf("Macintosh") != -1;

        electronDialog.showOpenDialog(
            {
              title: "Upload",
              properties: isMac ?
                ["openFile", "openDirectory", "multiSelections"] :
                ["openFile", "multiSelections"]
            },
          )
            .then(({canceled, filePaths}) => {
              if (!canceled && typeof fn == "function") {
                fn(filePaths);
              }
            });
      }

      function showDownloadDialog(fn) {
        electronDialog.showOpenDialog(
            {
              title: "Download",
              properties: ["openDirectory"]
            },
          )
            .then(({canceled, filePaths}) => {
              if (!canceled && typeof fn == "function") {
                fn(filePaths);
              }
            });
      }

      /**
       *
       * @param title
       * @param msg
       * @param fn
       * @param opt
       *    opt.cls: danger success warning info,
       *    opt.hideIcon:     default: false
       */
      function alert(title, msg, fn, opt) {
        opt = opt || {
          cls: "primary"
        };
        if (typeof opt == "number") {
          switch (opt) {
          case 2:
            opt = {
              cls: "warning"
            };
            break;
          case 1:
            opt = {
              cls: "danger"
            };
            break;
          default:
            opt = {
              cls: "primary"
            };
            break;
          }
        } else {
          opt = Object.assign({
            cls: "primary"
          }, opt);
        }
        var putData = {
          title: title,
          message: msg,
          opt: opt,
          callback: fn || function (flag) {}
        };

        $modal.open({
          templateUrl: dialogHtmlMapping.path,
          controller: ALERT_DIALOG_CONTROLLER_NAME,
          size: opt.size || "md",
          resolve: {
            putData: function () {
              return putData;
            }
          }
        }).result.then(angular.noop, angular.noop);
      }

      function confirm(title, msg, fn, opt) {
        opt = opt || {
          cls: "primary"
        };
        if (typeof opt == "number") {
          switch (opt) {
          case 2:
            opt = {
              cls: "warning"
            };
            break;
          case 1:
            opt = {
              cls: "danger"
            };
            break;
          default:
            opt = {
              cls: "primary"
            };
            break;
          }
        } else {
          opt = Object.assign({
            cls: "primary"
          }, opt);
        }
        var putData = {
          title: title,
          message: msg,
          opt: opt,
          callback: fn || function (flag) {}
        };

        $modal.open({
          templateUrl: dialogHtmlMapping.path,
          controller: CONFIRM_DIALOG_CONTROLLER_NAME,
          size: opt.size || "md",
          resolve: {
            putData: function () {
              return putData;
            }
          }
        }).result.then(angular.noop, angular.noop);
      }
    }
  ])
  .controller(ALERT_DIALOG_CONTROLLER_NAME, [
    "$scope",
    "$uibModalInstance",
    "putData",
    function ($scope, $modalInstance, putData) {
      angular.extend($scope, putData);
      $scope.isAlert = true;
      $scope.cancel = function () {
        $modalInstance.dismiss("cancel");
        putData.callback(false);
      };
      $scope.ok = function () {
        $modalInstance.dismiss("cancel");
        putData.callback(true);
      };
    }
  ])
  .controller(CONFIRM_DIALOG_CONTROLLER_NAME, [
    "$scope",
    "$uibModalInstance",
    "putData",
    function ($scope, $modalInstance, putData) {
      angular.extend($scope, putData);
      $scope.cancel = function () {
        $modalInstance.dismiss("cancel");
        putData.callback(false);
      };
      $scope.ok = function () {
        $modalInstance.dismiss("cancel");
        putData.callback(true);
      };
    }
  ]);
