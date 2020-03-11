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
  "AkHistory",
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
    Toast,
    AkHistory
  ) {
    const T = $translate.instant;

    angular.extend($scope, {
      item: {},
      clouds: [{
        name: T("auth.defaultCloud"),
        value: "default"
      }, {
        name: T("auth.customizedCloud"),
        value: "customized"
      }],
      privateCloud: privateCloud(),
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

    function privateCloud() {
      if (Config.exists()) {
        try {
          return Config.load();
        } catch (e) {
          return null;
        }
      }
      return null;
    }

    function open(a) {
      openExternal(a);
    }

    function showAkHistories() {
      $modal.open({
        templateUrl: "main/auth/modals/ak-histories-modal.html",
        controller: "akHistoriesModalCtrl",
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
              $scope.item.remember = true;
            }
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showCustomizedCloud() {
      $modal.open({
        templateUrl: "main/auth/modals/customize-cloud-modal.html",
        controller: "customizeCloudModalCtrl"
      }).result.then(angular.noop, () => { $scope.privateCloud = privateCloud(); });
    }

    function onSubmit(form1) {
      if (!form1.$valid) return;

      const data = angular.copy($scope.item),
            isPublicCloud = $scope.selectedCloud === 'default';

      data.servicetpl = Config.load(isPublicCloud).regions[0].endpoint;

      if (data.secret) {
        data.secret = data.secret.trim();
      }

      Toast.info(T("logining"), 1000);

      Auth.login(data).then(
        function () {
          if (isPublicCloud) {
            AuthInfo.switchToPublicCloud();
          } else {
            AuthInfo.switchToPrivateCloud();
          }

          if (data.remember) {
            AkHistory.add(isPublicCloud, data.id, data.secret, data.description);
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
