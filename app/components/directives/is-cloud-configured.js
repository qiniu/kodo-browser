angular.module("web").directive("isCloudConfigured", () => {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: (scope, element, attributes, controller) => {
      controller.$validators.isCloudConfigured = promise => {
        promise.then((value) => {
          if (value) {
            element.siblings('i').removeClass('blinking');
            controller.$setValidity('isCloudConfigured', true);
          } else {
            element.siblings('i').addClass('blinking');
            controller.$setValidity('isCloudConfigured', false);
          }
        });
      };
    }
  };
});
