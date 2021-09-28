import angular from 'angular'

import webModule from '@/app-module/web'

import Auth from '@/components/services/auth'
import AuthInfo from '@/components/services/authinfo'
import Const from '@/const'
import Config from '@/config'
import { DIALOG_FACTORY_NAME as Dialog } from '@/components/services/dialog.s'
import { TOAST_FACTORY_NAME as Toast } from '@/components/directives/toast-list'
import AkHistory from '@/components/services/ak-history'
import AuditLog from '@/components/services/audit-log'

import { akHistoriesModalHtmlMapping, customizeCloudModalHtmlMapping } from "@template-mappings/main/auth/modals"
import akHistoriesModalCtrl from './modals/ak-histories-modal'
import customizeCloudModalCtrl from './modals/customize-cloud-modal'

const LOGIN_CONTROLLER_NAME = 'loginCtrl'

webModule.controller(LOGIN_CONTROLLER_NAME, [
  "$q",
  "$timeout",
  "$scope",
  "$rootScope",
  "$translate",
  "$uibModal",
  Auth,
  AuthInfo,
  "$location",
  Const,
  Config,
  Dialog,
  Toast,
  AkHistory,
  AuditLog,
  function (
    $q,
    $timeout,
    $scope,
    $rootScope,
    $translate,
    $modal,
    Auth,
    AuthInfo,
    $location,
    Const,
    Config,
    Dialog,
    Toast,
    AkHistory,
    AuditLog,
  ) {
    const T = $translate.instant;

    angular.extend($scope, {
      item: {},
      clouds: [{
        name: "auth.defaultCloud",
        value: "default"
      }, {
        name: "auth.customizedCloud",
        value: "customized"
      }],
      isPrivateCloudConfigured: isPrivateCloudConfigured(),
      selectedCloud: selectedCloud(),

      showGuestNav: 1,

      onSubmit: onSubmit,
      showCustomizedCloud: showCustomizedCloud,
      showAkHistories: showAkHistories,

      open: open,
    });

    function selectedCloud() {
      return AuthInfo.usePublicCloud() || !Config.exists() ? 'default' : 'customized';
    }

    function isPrivateCloudConfigured() {
      const df = $q.defer();

      $timeout(() => {
        if (Config.exists()) {
          try {
            const config = Config.load(false);
            df.resolve(config && config.ucUrl);
          } catch (e) {
            df.resolve(false);
          }
        } else {
          df.resolve(false);
        }
      });

      return df.promise;
    }

    function open(a) {
      openExternal(a);
    }

    function showAkHistories() {
      $modal.open({
        templateUrl: akHistoriesModalHtmlMapping.path,
        controller: akHistoriesModalCtrl,
        size: 'lg',
        resolve: {
          choose: function() {
            return function(history) {
              if (history.isPublicCloud) {
                $scope.selectedCloud = 'default';
              } else {
                $scope.selectedCloud = 'customized';
              }
              $scope.item.id = history.accessKeyId;
              $scope.item.secret = history.accessKeySecret;
              $scope.item.description = history.description;
            }
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showCustomizedCloud() {
      $modal.open({
        templateUrl: customizeCloudModalHtmlMapping.path,
        controller: customizeCloudModalCtrl,
      }).result.then(angular.noop, () => { $scope.isPrivateCloudConfigured = isPrivateCloudConfigured(); });
    }

    function onSubmit(form1) {
      if (!form1.$valid) return;

      const data = angular.copy($scope.item),
            isPublicCloud = $scope.selectedCloud === 'default';

      if (data.id) {
        data.id = data.id.trim();
      }
      if (data.secret) {
        data.secret = data.secret.trim();
      }
      data.isPublicCloud = isPublicCloud;

      Toast.info(T("logining"), 1000);

      Auth.login(data).then(() => {
        if (isPublicCloud) {
          AuthInfo.switchToPublicCloud();
        } else {
          AuthInfo.switchToPrivateCloud();
        }

        if (data.remember) {
          AkHistory.add(isPublicCloud, data.id, data.secret, data.description);
        }
        AuditLog.log('login');
        Toast.success(T("login.successfully"), 1000);
        $location.url("/");
      }).catch((err) => {
        Toast.error(err.code + ":" + err.message, 5000);
        Dialog.alert(T('auth.login.error.title'), T('auth.login.error.description'), null, 1);
      });

      return false;
    }
  }
]);

export default LOGIN_CONTROLLER_NAME
