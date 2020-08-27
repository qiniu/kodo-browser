angular.module('web')
  .directive('restoreChecker', [
    function () {
      return {
        restrict: 'EA',
        templateUrl: 'main/files/modals/preview/restore-checker.html',
        transclude: true,
        scope: {
          bucketInfo: '=',
          objectInfo: '=',
          fileType: '=',
          afterCheckSuccess: '&',
          afterRestoreSubmit: '&'
        },
        controller: ['$scope', '$timeout','$uibModal','s3Client','safeApply', ctrlFn]
      }

      function ctrlFn($scope, $timeout, $modal, s3Client, safeApply){
        angular.extend($scope, {
          info: {
            msg: null
          },
          _Loading: false,
          showRestore: showRestore,
        });

        init();
        function init() {
          check(function() {
            if ($scope.afterCheckSuccess) {
              $scope.afterCheckSuccess();
            }
          });
        }
        function check(successCallback){
          $scope._Loading = true;

          s3Client.isFrozenOrNot($scope.bucketInfo.region, $scope.bucketInfo.bucket, $scope.objectInfo.path)
                  .then(function (data) {
            switch (data.status) {
            case 'normal':
              $scope.info.type = 0;
              $scope.info.showContent = true;
              if (successCallback) {
                successCallback()
              }
              break;
            case 'frozen':
              $scope.info.type = 1; //归档文件，需要恢复才能预览或下载
              $scope.info.showContent = false;
              break;
            case 'unfreezing':
              $scope.info.type = 2; // 归档文件正在恢复中，请耐心等待...;
              $scope.info.showContent = false;
              break;
            case 'unfrozen':
              $scope.info.type = 3; // '归档文件，已恢复'
              $scope.info.showContent = true;
              if (successCallback) {
                successCallback()
              }
              break;
            default:
              console.error("Unrecognized status from s3Client.isFrozenOrNot(): ", data.status);
            }
            $scope._Loading = false;
            safeApply($scope);
          }, function (err) {
            $scope._Loading = false;
            safeApply($scope);
          });
        }

        function showRestore(){
          $modal.open({
            templateUrl: 'main/files/modals/restore-modal.html',
            controller: 'restoreModalCtrl',
            resolve: {
              item: function(){
                return angular.copy($scope.objectInfo);
              },
              currentInfo: function(){
                return angular.copy($scope.bucketInfo);
              },
              callback: function(){
                return function(){
                  if($scope.afterRestoreSubmit){
                      $scope.afterRestoreSubmit();
                  }
                  init();
                };
              }
            }
          });
        }
      }
    }])
;
