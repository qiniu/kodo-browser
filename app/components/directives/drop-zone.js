angular
  .module("web")
  .directive("dropZone", function () {
    return {
      link: linkFn,
      restrict: "EA",
      transclude: false,
      scope: {
        dropZone: "="
      }
    };

    function linkFn(scope, ele, attr) {
      $(document).on("dragenter", stopPrev)
        .on("dragover", stopPrev)
        .on("dragleave", stopPrev)
        .on("drop", stopPrev);

      function stopPrev(e) {
        e.originalEvent.stopPropagation();
        e.originalEvent.preventDefault();
      }

      $(ele).on("drop", function(e) {
        scope.dropZone(e);
      });
    }
  });
