angular.module('web')
  .controller('addExternalPathModalCtrl', ['$scope', '$uibModalInstance', '$translate', 'callback', 'ExternalPath', 's3Client', 'Const', 'KodoClient', 'AuthInfo', 'AuditLog', 'Toast',
    function ($scope, $modalInstance, $translate, callback, ExternalPath, s3Client, Const, KodoClient, AuthInfo, AuditLog, Toast) {
      const T = $translate.instant,
           regions = KodoClient.getRegions(AuthInfo.usePublicCloud());

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
        s3Client.listFiles(newExternalPath.regionId, newExternalPath.bucketId, newExternalPath.objectPrefix, '').then(() => {
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
