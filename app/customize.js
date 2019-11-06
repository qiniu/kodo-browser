angular.module("web").factory("Customize", [
  function() {
    return {
      disable: {
        createBucket: true,
        deleteBucket: true
      },
      upgrade: {
      }
    }
  }
]);
