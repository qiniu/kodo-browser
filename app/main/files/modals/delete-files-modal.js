angular.module('web')
  .controller('deleteFilesModalCtrl', ['$scope', '$q', '$uibModalInstance', '$timeout', 'items', 'currentInfo', 'callback', 'QiniuClient', 'qiniuClientOpt', 'safeApply', 'AuditLog',
    function ($scope, $q, $modalInstance, $timeout, items, currentInfo, callback, QiniuClient, qiniuClientOpt, safeApply, AuditLog) {
      angular.extend($scope, {
        items: items,

        currentInfo:currentInfo,
        step : 1,
        start: start,
        stop: stop,
        close: close
      });

      function stop() {
        //$modalInstance.dismiss('cancel');
        $scope.isStop = true;
        QiniuClient.stopDeleteFiles();
      }
      function close(){
        $modalInstance.dismiss('cancel');
      }

      function start(){
        $scope.isStop = false;
        $scope.step = 2;

        AuditLog.log('deleteFiles', {
          regionId: currentInfo.regionId,
          bucket: currentInfo.bucketName,
          paths: items.map((item) => item.path),
        });

        QiniuClient.deleteFiles(currentInfo.regionId, currentInfo.bucketName, items, (prog) => {
          //进度
          $scope.progress = angular.copy(prog);
          safeApply($scope);
        }, qiniuClientOpt).then((terr) => {
          //结果
          $scope.step = 3;
          $scope.terr = terr;
          if (!terr || terr.length === 0) {
            AuditLog.log('deleteFilesDone');
          }
          callback();
        });
      }
    }])
;
