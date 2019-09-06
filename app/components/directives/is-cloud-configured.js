angular.module("web").directive("isCloudConfigured", () => {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: (scope, element, attributes, controller) => {
      controller.$validators.isCloudConfigured = value => {
        if (value) {
          element.siblings('i').css({'color': ''}).removeClass('blinking');
          return true;
        } else {
          element.siblings('i').css({'color': 'red'}).addClass('blinking');
          return false;
        }
      };
    }
  };
});
