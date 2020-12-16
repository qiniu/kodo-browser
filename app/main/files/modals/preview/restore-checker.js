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
          qiniuClientOpt: '=',
          afterCheckSuccess: '&',
        },
        controller: ['$scope', '$timeout','$uibModal','QiniuClient','safeApply', ctrlFn]
      }

      function ctrlFn($scope, $timeout, $modal, QiniuClient, safeApply){
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

          QiniuClient.getFrozenInfo($scope.bucketInfo.regionId, $scope.bucketInfo.bucketName, $scope.objectInfo.path, $scope.qiniuClientOpt)
                  .then(function (data) {
            switch (data.status) {
            case 'Normal':
              $scope.info.type = 0;
              $scope.info.showContent = true;
              if (successCallback) {
                successCallback()
              }
              break;
            case 'Frozen':
              $scope.info.type = 1; //归档文件，需要恢复才能预览或下载
              $scope.info.showContent = false;
              break;
            case 'Unfreezing':
              $scope.info.type = 2; // 归档文件正在恢复中，请耐心等待...;
              $scope.info.showContent = false;
              break;
            case 'Unfrozen':
              $scope.info.type = 3; // '归档文件，已恢复'
              $scope.info.showContent = true;
              if (successCallback) {
                successCallback()
              }
              break;
            default:
              console.error("Unrecognized status from QiniuClient.getFrozenInfo(): ", data.status);
            }
          }).finally(() => {
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
              qiniuClientOpt: () => {
                return angular.copy($scope.qiniuClientOpt);
              },
              callback: function(){
                return init;
              }
            }
          });
        }
      }
    }])
;
