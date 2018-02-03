angular.module("web").controller("loginCtrl", [
  "$scope",
  "$rootScope",
  "$translate",
  "Auth",
  "AuthInfo",
  "$timeout",
  "$location",
  "Const",
  "Dialog",
  "Toast",
  "Cipher",
  function(
    $scope,
    $rootScope,
    $translate,
    Auth,
    AuthInfo,
    $timeout,
    $location,
    Const,
    Dialog,
    Toast,
    Cipher
  ) {
    var DEF_EP_TPL = "https://{region}-s3.qiniu.com";

    var KEY_REMEMBER = Const.KEY_REMEMBER;
    var SHOW_HIS = Const.SHOW_HIS;
    var KEY_AUTHTOKEN = "key-authtoken";
    var regions = angular.copy(Const.regions);

    var T = $translate.instant;

    angular.extend($scope, {
      gtab: parseInt(localStorage.getItem("gtag") || 1),
      flags: {
        remember: "NO",
        showHis: "NO"
      },
      item: {
        eptpl: DEF_EP_TPL
      },
      eptplType: "default",

      hideTopNav: 1,
      reg_osspath: /^kodo\:\/\//,
      regions: regions,
      onSubmit: onSubmit,
      showCleanHistories: showCleanHistories,
      useHis: useHis,
      showRemoveHis: showRemoveHis,

      open: open,
      eptplChange: eptplChange
    });

    $scope.$watch("item.eptpl", function(v) {
      $scope.eptplType = v == DEF_EP_TPL ? "default" : "customize";
    });
    $scope.$watch("gtab", function(v) {
      localStorage.setItem("gtag", v);
    });

    function eptplChange(t) {
      $scope.eptplType = t;
      console.log(t);
      if (t == "default") {
        $scope.item.eptpl = DEF_EP_TPL;
      } else {
        $scope.item.eptpl = "";
      }
    }

    function open(a) {
      openExternal(a);
    }

    function useHis(h) {
      angular.extend($scope.item, h);
      // $scope.item.id=h.id;
      // $scope.item.secret = h.secret;
      // $scope.item.desc = h.desc;
    }

    function showRemoveHis(h) {
      var title = T("auth.removeAK.title"); //删除AK
      var message = T("auth.removeAK.message", { id: h.id }); //'ID：'+h.id+', 确定删除?'
      Dialog.confirm(
        title,
        message,
        function(b) {
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
        function(b) {
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
      if (data.secret) data.secret = data.secret.trim();

      delete data.authToken;
      delete data.securityToken;

      if ($scope.flags.remember == "YES") {
        AuthInfo.remember(data);
      }

      Toast.info(T("logining"), 1000);

      Auth.login(data).then(
        function() {
          if ($scope.flags.remember == "YES") {
            AuthInfo.addToHistories(data);
          }

          Toast.success(T("login.successfully"), 1000);

          $location.url("/");
        },
        function(err) {
          Toast.error(err.code + ":" + err.message);
        }
      );

      return false;
    }
  }
]);
