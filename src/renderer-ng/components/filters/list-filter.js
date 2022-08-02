import webModule from '@/app-module/web'

const LIST_FILTER_NAME = 'listFilter'

webModule.filter(LIST_FILTER_NAME, function() {
  return function(arr, keyFn, value) {
    if (!value) return arr;
    if (arr && arr.length > 0) {
      var t = [];
      if (typeof keyFn == "string") {
        angular.forEach(arr, function(n) {
          if (n[keyFn].indexOf(value) != -1) {
            t.push(n);
          }
        });
      } else if (typeof keyFn == "function") {
        angular.forEach(arr, function(n) {
          if (keyFn(n).indexOf(value) != -1) {
            t.push(n);
          }
        });
      }
      return t;
    }
    return [];
  };
});

export default LIST_FILTER_NAME
