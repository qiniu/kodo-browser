import webModule from '@/app-module/web'
import Clipboard from 'clipboard'

import { TOAST_FACTORY_NAME as Toast } from "./toast-list"

/*
 <input type="text" ng-model="abc" cleanable-input x="-3" y="-5"/>
 */

const CLIPBOARD_BUTTON_DIRECTIVE = 'clipboardButton'

webModule
  .directive(CLIPBOARD_BUTTON_DIRECTIVE, [
    "$translate",
    Toast,
    function ($translate, Toast) {
      var T = $translate.instant;

      return {
        restrict: "EA",
        scope: {
          action: "=",
          target: "=",
          success: "&"
        },
        link: function link(scope, ele) {
          var d = new Clipboard(ele[0], {
            text: function () {
              return $(scope.target).val();
            },
            action: scope.action || "copy"
          });

          d.on("success", function () {
            Toast.success(T("copy.successfully")); //'复制成功'
          });
        }
      };
    }
  ]);

export default CLIPBOARD_BUTTON_DIRECTIVE
