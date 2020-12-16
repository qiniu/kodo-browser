angular.module('web')
  .controller('addFolderModalCtrl', ['$scope', '$uibModalInstance', 'currentInfo', 'qiniuClientOpt', 'callback', 'QiniuClient', 'AuditLog',
    function ($scope, $modalInstance, currentInfo, qiniuClientOpt, callback, QiniuClient, AuditLog) {

      angular.extend($scope, {
        currentInfo: currentInfo,
        item: {},
        cancel: cancel,
        onSubmit: onSubmit,
        reg: {
          folderName: /^[^\/]+$/
        }
      });

      function cancel() {
        $modalInstance.dismiss('close');
      }

      function onSubmit(form) {
        if (!form.$valid) return;

        const folderName = $scope.item.name;
        const fullPath = currentInfo.key + folderName + '/';
        QiniuClient.createFolder(currentInfo.regionId, currentInfo.bucketName, fullPath, qiniuClientOpt).then(function () {
          AuditLog.log('addFolder', {
            regionId: currentInfo.regionId,
            bucket: currentInfo.bucketName,
            path: fullPath
          });
          callback();
          cancel();
        });
      }
    }
  ]);
