angular.module('web')
  .controller('restoreFilesModalCtrl', ['$scope', '$q', '$uibModalInstance', '$timeout', 'items', 'currentInfo', 'callback', 'QiniuClient', 'qiniuClientOpt', 'safeApply', 'AuditLog',
    function ($scope, $q, $modalInstance, $timeout, items, currentInfo, callback, QiniuClient, qiniuClientOpt, safeApply, AuditLog) {
      angular.extend($scope, {
        items: items,
        currentInfo:currentInfo,
        info: {
          days: 1,
        },
        step : 1,
        stop: stop,
        close: close,
        onSubmit: onSubmit
      });

      function stop() {
        $scope.isStop = true;
        QiniuClient.stopRestoreFiles();
      }

      function close(){
        $modalInstance.dismiss('cancel');
      }

      function onSubmit(form1) {
      if(!form1.$valid) return;

        $scope.isStop = false;
        $scope.step = 2;
        const days = $scope.info.days;

        AuditLog.log('restoreFiles', {
          regionId: currentInfo.regionId,
          bucket: currentInfo.bucketName,
          paths: items.map((item) => item.path),
          days: days,
        });

        QiniuClient.restoreFiles(currentInfo.regionId, currentInfo.bucketName, items, days, (prog) => {
          //进度
          $scope.progress = angular.copy(prog);
          safeApply($scope);
        }, qiniuClientOpt).then((terr) => {
          //结果
          $scope.step = 3;
          $scope.terr = terr;
          if (!terr || terr.length === 0) {
            AuditLog.log('restoreFilesDone');
          }
          callback();
        });
      }
    }])
;
