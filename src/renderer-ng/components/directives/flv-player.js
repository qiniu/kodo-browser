import webModule from '@/app-module/web'

const FLV_PLAYER_DIRECTIVE_NAME = 'flvPlayer'

webModule
  .directive(FLV_PLAYER_DIRECTIVE_NAME, [
    "$timeout",
    function ($timeout) {
      return {
        link: linkFn,
        restrict: "EA",
        transclude: false,
        scope: {
          src: "=",
          autoplay: "=" //autoplay
        }
      };

      function linkFn(scope, ele, attr) {
        scope.$watch("src", init);

        function init() {
          if (!scope.src) return;
          var src =
            "./static/flv-player.html?src=" +
            encodeURIComponent(scope.src) +
            "&autoplay=" +
            (scope.autoplay || "");
          ele.html(
            '<iframe scrolling="no" style="border:0;width:100%;height:460px" src="' +
            src +
            '"><iframe>'
          );
        }
      }
    }
  ]);

export default FLV_PLAYER_DIRECTIVE_NAME
