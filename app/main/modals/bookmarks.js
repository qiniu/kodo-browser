"use strict";

angular.module("web").controller("bookmarksCtrl", [
  "$scope",
  "$rootScope",
  "$translate",
  "$state",
  "$uibModalInstance",
  "Bookmark",
  "Toast",
  function ($scope, $rootScope, $translate, $state, $modalInstance, Bookmark, Toast) {
    const T = $translate.instant;

    angular.extend($scope, {
      goTo: goTo,
      remove: remove,
      cancel: cancel
    });

    function goTo(bookmark) {
      $rootScope.$broadcast("gotoKodoAddress", bookmark.fullPath);
      cancel();
    }

    function refresh() {
      $scope.bookmarks = Bookmark.list().map((bookmark) => {
        bookmark.time = new Date(moment.unix(bookmark.timestamp));
        return bookmark;
      });
    }

    function remove(bookmark) {
      Bookmark.remove(bookmark.fullPath, bookmark.mode);
      Toast.warning(T("bookmarks.delete.success"));
      refresh();
    }

    function cancel() {
      $modalInstance.dismiss("close");
    }

    refresh();
  }
]);
