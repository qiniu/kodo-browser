angular.module("web").controller("loginCtrl", [
  "$scope",
  "$rootScope",
  "$translate",
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
    Auth,
    AuthInfo,
    $location,
    Const,
    Config,
    Dialog,
    Toast
  ) {
    var DEF_EPTPL = "https://s3-{region}.qiniucs.com";
    var regions = angular.copy(Config.regions);

    var T = $translate.instant;

    angular.extend($scope, {
      flags: {
        showMore: 0,
        remember: "NO",
        showHis: "NO"
      },
      item: {
        domain: Global.domain,
        eptpl: DEF_EPTPL,
        servicetpl: (regions[0].endpoint)
      },
      eptplType: "default",

      regions: regions,

      showGuestNav: 1,

      onSubmit: onSubmit,
      showCleanHistories: showCleanHistories,
      useHis: useHis,
      showRemoveHis: showRemoveHis,

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

      var data = angular.copy($scope.item);

      // append domain
      if (data.id) {
        data.username = data.id + Global.domain;
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
