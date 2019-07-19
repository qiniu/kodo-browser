angular.module("web").directive("isMultipleOfFour", () => {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: (scope, element, attrs, controller) => {
      controller.$validators.isMultipleOfFour = value => {
        if (!value) {
            return true;
        }
        return value % 4 == 0;
      };
    }
  };
});
