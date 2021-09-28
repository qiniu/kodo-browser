import webModule from '@/app-module/web'

const SAFE_APPLE_FACTORY_NAME = 'safeApply'

webModule.factory(SAFE_APPLE_FACTORY_NAME, [
  function() {
    return function($scope, fn) {
      if (!$scope.$root) return;
      var phase = $scope.$root.$$phase;
      if (phase == "$apply" || phase == "$digest") {
        if (fn) {
          $scope.$eval(fn);
        }
      } else {
        if (fn) {
          $scope.$apply(fn);
        } else {
          $scope.$apply();
        }
      }
    };
  }
]);

export default SAFE_APPLE_FACTORY_NAME
