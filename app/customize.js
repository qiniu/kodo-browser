angular.module("web").factory("Customize", [
  function() {
    return {
      disable: {
        createBucket: false,
        deleteBucket: false
      }
    }
  }
]);
