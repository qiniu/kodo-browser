import angular from 'angular'
import moment from "moment/moment"

import webModule from '@/app-module/web'

import * as Bookmark from '@/components/services/bookmark'
import { TOAST_FACTORY_NAME as Toast } from '@/components/directives/toast-list'

const BOOKMARKS_CONTROLLER_NAME = 'bookmarksCtrl'

webModule.controller(BOOKMARKS_CONTROLLER_NAME, [
  "$scope",
  "$rootScope",
  "$translate",
  "$state",
  "$uibModalInstance",
  Toast,
  function ($scope, $rootScope, $translate, $state, $modalInstance, Toast) {
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

export default BOOKMARKS_CONTROLLER_NAME
