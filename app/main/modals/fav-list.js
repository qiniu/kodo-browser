"use strict";

angular.module("web").controller("favListCtrl", [
  "$scope",
  "$rootScope",
  "$translate",
  "$state",
  "$uibModalInstance",
  "Fav",
  "Toast",
  function ($scope, $rootScope, $translate, $state, $modalInstance, Fav, Toast) {
    var T = $translate.instant;

    angular.extend($scope, {
      goTo: goTo,
      refresh: refresh,
      removeFav: removeFav,
      cancel: cancel
    });

    refresh();

    function goTo(url) {
      $rootScope.$broadcast("gotoKodoAddress", url);
      cancel();
    }

    function refresh() {
      var arr = Fav.list();
      $scope.items = arr;
    }

    function removeFav(item) {
      Fav.remove(item.url);
      Toast.warning(T("bookmarks.delete.success")); //删除书签成功
      refresh();
    }

    function cancel() {
      $modalInstance.dismiss("close");
    }
  }
]);
