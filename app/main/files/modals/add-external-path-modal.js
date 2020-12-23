angular.module('web')
  .controller('addExternalPathModalCtrl', ['$scope', '$uibModalInstance', '$translate', 'callback', 'ExternalPath', 's3Client', 'Const', 'regions', 'AuditLog', 'Toast',
    function ($scope, $modalInstance, $translate, callback, ExternalPath, s3Client, Const, regions, AuditLog, Toast) {
      const T = $translate.instant;

      angular.extend($scope, {
        regions: regions,
        item: {
            regionId: regions[0].id
        },
        cancel: cancel,
        onSubmit: onSubmit,
      });

      function cancel() {
        $modalInstance.dismiss('cancel');
      }

      function onSubmit(form) {
        if (!form.$valid) return;

        const item = angular.copy($scope.item);

        const newExternalPath = ExternalPath.new(item.path, item.regionId);
        s3Client.listFiles(newExternalPath.regionId, newExternalPath.bucketId, newExternalPath.objectPrefix, 1, '').then(() => {
          ExternalPath.create(item.path, item.regionId).then(() => {
            AuditLog.log('addExternalPath', {
              path: item.path,
              regionId: item.regionId
            });
            callback();
            cancel();
          }, (err) => {
            Toast.error(err);
            cancel();
          });
        }, () => {
          cancel();
        })
      }
    }
  ]);
