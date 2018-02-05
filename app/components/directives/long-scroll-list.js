angular.module("web").directive("longScrollList", [
  "$timeout",
  function($timeout) {
    return {
      restrict: "EA",
      transclude: true,
      scope: {
        loadMoreFn: "=loadMore",
        triggerSize: "="
      },
      template: "<div ng-transclude></div>",

      link: function(scope, ele, attr) {
        var t = ele.offset().top;
        var h = $(ele).height();

        var SIZE = scope.triggerSize || 20;

        $(ele).scroll(onScroll);
        //effect();

        var tid;
        function onScroll() {
          $timeout.cancel(tid);
          tid = $timeout(function() {
            effect();
          }, 200);
        }

        function effect() {
          var scrollTop = $(ele).scrollTop();
          var scrollHeight = $(ele)[0].scrollHeight;

          if (scrollTop + h > scrollHeight - SIZE) {
            if (typeof scope.loadMoreFn == "function") scope.loadMoreFn();
          }

        }
      }
    };
  }
]);
