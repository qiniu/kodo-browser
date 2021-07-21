angular.module('web')
  .controller('updateStorageClassesModalCtrl', ['$scope', '$q', '$uibModalInstance', '$timeout', 'items', 'currentInfo', 'callback', 'QiniuClient', 'qiniuClientOpt', 'safeApply', 'AuditLog',
    function ($scope, $q, $modalInstance, $timeout, items, currentInfo, callback, QiniuClient, qiniuClientOpt, safeApply, AuditLog) {
      angular.extend($scope, {
        items: items,
        currentInfo:currentInfo,
        info: {
          updateTo: 'Standard',
        },
        step : 1,
        stop: stop,
        close: close,
        onSubmit: onSubmit
      });

      function stop() {
        $scope.isStop = true;
        QiniuClient.stopSetStorageClassOfFiles();
      }

      function close(){
        $modalInstance.dismiss('cancel');
      }

      function onSubmit(form1) {
      if(!form1.$valid) return;

        $scope.isStop = false;
        $scope.step = 2;
        const newStorageClass = $scope.info.updateTo;

        AuditLog.log('setStorageClassOfFiles', {
          regionId: currentInfo.regionId,
          bucket: currentInfo.bucketName,
          paths: items.map((item) => item.path),
          updateTo: newStorageClass,
        });

        QiniuClient.setStorageClassOfFiles(currentInfo.regionId, currentInfo.bucketName, items, newStorageClass, (prog) => {
          //进度
          $scope.progress = angular.copy(prog);
          safeApply($scope);
        }, qiniuClientOpt).then((terr) => {
          //结果
          $scope.step = 3;
          $scope.terr = terr;
          if (!terr || terr.length === 0) {
            AuditLog.log('setStorageClassOfFilesDone');
          }
          callback();
        });
      }
    }])
;
