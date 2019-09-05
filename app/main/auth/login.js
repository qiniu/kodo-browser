angular.module("web").controller("loginCtrl", [
  "$scope",
  "$rootScope",
  "$translate",
  "$uibModal",
  "Auth",
  "AuthInfo",
  "$location",
  "Const",
  "Config",
  "Dialog",
  "Toast",
  function (
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
    Toast
  ) {
    const T = $translate.instant;

    angular.extend($scope, {
      flags: {
        showMore: 0,
        remember: "NO",
        showHis: "NO"
      },
      item: {
        domain: Global.domain,
      },

      clouds: [{
        name: T("auth.defaultCloud"),
        value: "default"
      }, {
        name: T("auth.customizedCloud"),
        value: "customized"
      }],
      selectedCloud: AuthInfo.usePublicCloud() ? 'default' : 'customized',

      showGuestNav: 1,

      onSubmit: onSubmit,
      showCleanHistories: showCleanHistories,
      useHis: useHis,
      showCustomizedCloud: showCustomizedCloud,
      showRemoveHis: showRemoveHis,

      open: open,
    });

    function open(a) {
      openExternal(a);
    }

    function useHis(h) {
      angular.extend($scope.item, h);
    }

    function showRemoveHis(h) {
      var title = T("auth.removeAK.title");
      var message = T("auth.removeAK.message", {
        id: h.id
      });
      Dialog.confirm(
        title,
        message,
        function (b) {
          if (b) {
            AuthInfo.removeFromHistories(h.id);
            listHistories();
          }
        },
        1
      );
    }

    function listHistories() {
      $scope.his = AuthInfo.listHistories();
    }

    function showCleanHistories() {
      var title = T("auth.clearAKHistories.title"); //清空AK历史
      var message = T("auth.clearAKHistories.message"); //确定?
      var successMessage = T("auth.clearAKHistories.successMessage"); //已清空AK历史
      Dialog.confirm(
        title,
        message,
        function (b) {
          if (b) {
            AuthInfo.cleanHistories();
            listHistories();
            Toast.success(successMessage);
          }
        },
        1
      );
    }

    function showCustomizedCloud() {
      $modal.open({
        templateUrl: "main/auth/modals/customize-cloud-modal.html",
        controller: "customizeCloudModalCtrl"
      }).result.then(angular.noop, angular.noop);
    }

    function onSubmit(form1) {
      if (!form1.$valid) return;

      const data = angular.copy($scope.item),
            isPublicCloud = $scope.selectedCloud === 'default';

      data.servicetpl = Config.load(isPublicCloud).regions[0].endpoint;

      // append domain
      if (data.id) {
        data.username = data.id + Global.domain;
      }
      // trim password
      if (data.secret) {
        data.secret = data.secret.trim();
      }

      delete data.username;
      delete data.password;

      if ($scope.flags.remember == "YES") {
        AuthInfo.remember(data);
      }

      Toast.info(T("logining"), 1000);

      Auth.login(data).then(
        function () {
          if (isPublicCloud) {
            AuthInfo.switchToPublicCloud();
          } else {
            AuthInfo.switchToPrivateCloud();
          }

          if ($scope.flags.remember == "YES") {
            AuthInfo.addToHistories(data);
          }
          Toast.success(T("login.successfully"), 1000);
          $location.url("/");
        },
        function (err) {
          Toast.error(err.code + ":" + err.message);
        }
      );

      return false;
    }
  }
]);
