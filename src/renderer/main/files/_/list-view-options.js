import angular from 'angular'

import webModule from '@/app-module/web'

import './list.css'

const LIST_VIEW_OPTIONS_CONTROLLER_NAME = 'listViewOptionsCtrl'

webModule
  .controller(LIST_VIEW_OPTIONS_CONTROLLER_NAME, ['$scope', function ($scope) {

    angular.extend($scope, {
      setListView: setListView,
    });

    $scope.ref.isListView = getListView();

    function getListView(){
      return localStorage.getItem('is-list-view') !== 'false';
    }

    function setListView(f) {
      $scope.ref.isListView = f;
      localStorage.setItem('is-list-view', f);
    }
  }]);

export default LIST_VIEW_OPTIONS_CONTROLLER_NAME
