angular.module("web").controller("loginCtrl", [
  "$scope",
  "$rootScope",
  "$translate",
  "Auth",
  "AuthInfo",
  "$location",
  "Const",
  "Dialog",
  "Toast",
  function (
    $scope,
    $rootScope,
    $translate,
    Auth,
    AuthInfo,
    $location,
    Const,
    Dialog,
    Toast
  ) {
    var DEF_EPTPL = "https://s3-{region}.qiniucs.com";
    var KEY_REMEMBER = Const.KEY_REMEMBER;
    var KEY_LOGINTPL = Const.KEY_LOGINTPL;
    var KEY_SERVICETPL = Const.KEY_SERVICETPL;
    var KEY_REGION = Const.KEY_REGION;
    var regions = angular.copy(Const.regions);

    var T = $translate.instant;

    angular.extend($scope, {
      flags: {
        showMore: 0,
        remember: "NO",
        showHis: "NO"
      },
      item: {
        domain: Global.custom_settings.domain,
        eptpl: DEF_EPTPL,
        logintpl: (localStorage.getItem(KEY_LOGINTPL) || Global.custom_settings.loginURL),
        servicetpl: (localStorage.getItem(KEY_SERVICETPL) || Global.custom_settings.serviceURL)
      },
      eptplType: "default",

      regions: regions,

      showGuestNav: 1,
      showCloudLogin: Global.custom_settings.appCloud,

      onSubmit: onSubmit,
      showCleanHistories: showCleanHistories,
      useHis: useHis,
      showRemoveHis: showRemoveHis,

      onSubmitPass: onSubmitPass,

      open: open,
      eptplChange: eptplChange
    });

    $scope.$watch("item.eptpl", function (v) {
      $scope.eptplType = v == DEF_EPTPL ? "default" : "customize";
    });

    function eptplChange(t) {
      $scope.eptplType = t;

      if (t == "default") {
        $scope.item.eptpl = DEF_EPTPL;
      } else {
        $scope.item.eptpl = "";
      }
    }

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

    function onSubmit(form1) {
      if (!form1.$valid) return;

      localStorage.setItem(KEY_REMEMBER, $scope.flags.remember);

      var data = angular.copy($scope.item);

      // append domain
      if (data.id) {
        data.username = data.id + Global.custom_settings.domain;
      }
      // trim password
      if (data.secret) {
        data.secret = data.secret.trim();
      }

      $scope.regions.forEach((region) => {
        if (region.endpoint == data.servicetpl) {
          data.region = region.id;
        }
      });

      delete data.username;
      delete data.password;

      if ($scope.flags.remember == "YES") {
        AuthInfo.remember(data);
      }

      Toast.info(T("logining"), 1000);

      Auth.login(data).then(
        function () {
          if ($scope.flags.remember == "YES") {
            AuthInfo.addToHistories(data);
          }

          localStorage.setItem(KEY_SERVICETPL, data.servicetpl);
          localStorage.setItem(KEY_REGION, data.region);

          Toast.success(T("login.successfully"), 1000);

          $location.url("/");
        },
        function (err) {
          Toast.error(err.code + ":" + err.message);
        }
      );

      return false;
    }

    function onSubmitPass(form2) {
      if (!form2.$valid) return;

      localStorage.setItem(KEY_REMEMBER, $scope.flags.remember);

      var data = angular.copy($scope.item);

      //append domain
      if (data.username) {
        data.username = data.username + Global.custom_settings.domain;
      }
      //trim password
      if (data.password) {
        data.password = data.password.trim();
      }

      delete data.id;
      delete data.secret;

      if ($scope.flags.remember == "YES") {
        AuthInfo.remember(data);
      }

      Toast.info(T("logining"), 1000);

      Auth.loginPass(data).then(
        function () {
          if ($scope.flags.remember == "YES") {
            AuthInfo.addToHistories(data);
          }

          localStorage.setItem(KEY_LOGINTPL, data.logintpl);
          localStorage.setItem(KEY_SERVICETPL, data.servicetpl);

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
