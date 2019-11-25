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
            msg: null,
            needRestore: false,
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
          $scope.info.needRestore = false;

          s3Client.getFileInfo($scope.bucketInfo.region, $scope.bucketInfo.bucket, $scope.objectInfo.path)
                  .then(function (data) {
            if (data.Restore) {
              var info = s3Client.parseRestoreInfo(data.Restore);
              if (info['ongoing-request'] === 'true'){
                $scope.info.type = 2;// '归档文件正在恢复中，请耐心等待...';
                $scope.info.showContent = false;
              } else {
                $scope.info.expired_time = info['expiry-date'];
                $scope.info.type = 3;// '归档文件，已恢复，可读截止时间：'+ moment(new Date(info['expiry-date'])).format('YYYY-MM-DD HH:mm:ss');
                $scope.info.showContent = true;
                $scope.info.needRestore = true;
                if (successCallback) {
                  successCallback()
                }
              }
            } else {
              if ($scope.objectInfo.storageClass == 'Archive'){
                $scope.info.type = 1; //归档文件，需要恢复才能预览或下载
                $scope.info.showContent = false;
                $scope.info.needRestore = true;
              } else {
                $scope.info.type = 0;
                $scope.info.showContent = true;
                if (successCallback) {
                  successCallback()
                }
              }
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
