angular.module('web')
  .controller('customizeCloudModalCtrl', ['$scope', '$translate', '$uibModalInstance', 'Config',
    function ($scope, $translate, $modalInstance, Config) {
      const T = $translate.instant;
      const config = Config.load(false);

      angular.extend($scope, {
        ucUrl: config.ucUrl,
        regions: config.regions.length ? config.regions : [{}],
        addRegion: addRegion,
        removeRegion: removeRegion,
        onSubmit: onSubmit,
        cancel: cancel,
      });

      function addRegion() {
        $scope.regions.push({});
      }

      function removeRegion(index) {
        $scope.regions.splice(index, 1);
      }

      function onSubmit(form) {
        if (!form.$valid) return false;

        let ucUrl = angular.copy($scope.ucUrl);
        let regions = angular.copy($scope.regions);
        Config.save(ucUrl, regions);
        cancel();
      }

      function cancel() {
        $modalInstance.dismiss('close');
      }
    }
  ]);
