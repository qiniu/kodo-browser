import webModule from '@/app-module/web'

const AUTO_HEIGHT_DIRECTIVE_NAME = 'autoHeight'

webModule
  .directive(AUTO_HEIGHT_DIRECTIVE_NAME, [
    "$timeout",
    function ($timeout) {
      return {
        link: linkFn,
        restrict: "EA",
        transclude: false,
        scope: {
          autoHeight: "="
          //bottomLoader: '&'
        }
      };

      function linkFn(scope, ele, attr) {
        var h = parseInt(scope.autoHeight);

        ele.css({
          overflow: "auto",
          position: "relative"
        });

        var tid;

        function resize() {
          $timeout.cancel(tid);
          tid = $timeout(function () {
            var v = $(window).height() + h;
            $(ele).height(v);
          }, 300);
        }

        $(window).resize(resize);
        resize();
      }
    }
  ]);

export default AUTO_HEIGHT_DIRECTIVE_NAME
