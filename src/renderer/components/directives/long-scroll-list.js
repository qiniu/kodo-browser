import webModule from '@/app-module/web'

const LONG_SCROLL_LIST_DIRECTIVE_NAME = 'longScrollList'

webModule
  .directive(LONG_SCROLL_LIST_DIRECTIVE_NAME, [
    "$timeout",
    function ($timeout) {
      return {
        restrict: "EA",
        transclude: true,
        scope: {
          loadMoreFn: "=loadMore",
          triggerSize: "="
        },
        template: "<div ng-transclude></div>",

        link: function (scope, ele, attr) {
          var t = ele.offset().top;
          var h = $(ele).height();
          var size = scope.triggerSize || 20;

          $(ele).scroll(onScroll);

          var tid;

          function onScroll() {
            $timeout.cancel(tid);
            tid = $timeout(function () {
              effect();
            }, 200);
          }

          function effect() {
            var scrollTop = $(ele).scrollTop();
            var scrollHeight = $(ele)[0].scrollHeight;

            if (scrollTop + h > scrollHeight - size) {
              if (typeof scope.loadMoreFn == "function") scope.loadMoreFn();
            }

          }
        }
      };
    }
  ]);

export default LONG_SCROLL_LIST_DIRECTIVE_NAME
