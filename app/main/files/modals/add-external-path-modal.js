angular.module('web')
  .controller('addExternalPathModalCtrl', ['$scope', '$uibModalInstance', '$translate', 'callback', 'ExternalPath', 's3Client', 'Const', 'Config', 'AuthInfo', 'Toast',
    function ($scope, $modalInstance, $translate, callback, ExternalPath, s3Client, Const, Config, AuthInfo, Toast) {
      const T = $translate.instant,
           regions = angular.copy(Config.load(AuthInfo.usePublicCloud()).regions);

      angular.extend($scope, {
        regions: regions,
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
