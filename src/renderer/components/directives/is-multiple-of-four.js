import webModule from '@/app-module/web'

const IS_MULTIPLE_OF_FOUR = 'isMultipleOfFour'

webModule
  .directive(IS_MULTIPLE_OF_FOUR, () => {
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

export default IS_MULTIPLE_OF_FOUR
