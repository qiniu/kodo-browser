import webModule from '@/app-module/web'

const IS_CLOUD_CONFIGURED_DIRECTIVE_NAME = 'isCloudConfigured'

webModule
  .directive(IS_CLOUD_CONFIGURED_DIRECTIVE_NAME, () => {
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

export default IS_CLOUD_CONFIGURED_DIRECTIVE_NAME
