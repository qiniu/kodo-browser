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
    var DEF_EPTPL = "https://{region}-s3.qiniu.com";
    var KEY_REMEMBER = Const.KEY_REMEMBER;
    var SHOW_HIS = Const.SHOW_HIS;
    var regions = angular.copy(Const.regions);

    var T = $translate.instant;

    angular.extend($scope, {
      gtab: parseInt(localStorage.getItem("gtag") || 1),
      flags: {
        remember: "NO",
        showHis: "NO"
      },
      item: {
        eptpl: DEF_EPTPL,
        ecloudtpl: "",
        s3apitpl: ""
      },
      eptplType: "default",

      hideTopNav: 1,
      hideCloud: true,
      regions: regions,
      defaultRegion: "",

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
    $scope.$watch("gtab", function (v) {
      localStorage.setItem("gtag", v);
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
      var title = T("auth.removeAK.title"); //删除AK
      var message = T("auth.removeAK.message", {
        id: h.id
      }); //'ID：'+h.id+', 确定删除?'
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

      //trim password
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

    function onSubmitPass(form2) {
      if (!form2.$valid) return;

      localStorage.setItem(KEY_REMEMBER, $scope.flags.remember);

      var data = angular.copy($scope.item);

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