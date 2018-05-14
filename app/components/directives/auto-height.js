angular
  .module("web")
  .directive("autoHeight", [
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
          //'border-bottom': '1px solid #ccc',
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