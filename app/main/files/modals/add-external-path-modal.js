angular.module('web')
  .controller('addExternalPathModalCtrl', ['$scope', '$uibModalInstance', '$translate', 'callback', 'ExternalPath', 'Const', 'Config', 'AuthInfo',
    function ($scope, $modalInstance, $translate, callback, ExternalPath, Const, Config, AuthInfo) {
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

        var item = angular.copy($scope.item);

        // 判定有效性
        ExternalPath.update(item.path, item.regionId).then(function (result) {
          callback();
          cancel();
        });
      }
    }
  ]);
