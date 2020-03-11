angular.module('web')
  .controller('addFolderModalCtrl', ['$scope', '$uibModalInstance', 'currentInfo', 'callback', 's3Client', 'AuditLog',
    function ($scope, $modalInstance, currentInfo, callback, s3Client, AuditLog) {

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
        s3Client.createFolder(currentInfo.region, currentInfo.bucket, fullPath).then(function () {
          AuditLog.log('addFolder', {
            regionId: currentInfo.region,
            bucket: currentInfo.bucketName,
            path: fullPath
          });
          callback();
          cancel();
        });
      }
    }
  ]);
