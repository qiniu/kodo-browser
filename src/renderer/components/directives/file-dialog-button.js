import webModule from '@/app-module/web'

import './file-dialog-button.css'

const FILE_DIALOG_BUTTON_DIRECTIVE_NAME = 'fileDialogButton'

webModule
  .directive(FILE_DIALOG_BUTTON_DIRECTIVE_NAME, function () {
    return {
      link: linkFn,
      restrict: "EA",
      transclude: false,
      scope: {
        fileChange: "="
      }
    };

    function linkFn(scope, ele, attr) {
      $(ele).on("change", function (e) {
        scope.fileChange.call({}, e.target.files);
      });
    }
  });

export default FILE_DIALOG_BUTTON_DIRECTIVE_NAME
