angular.module('web')
  .controller('customizeCloudModalCtrl', ['$scope', '$translate', '$uibModalInstance', 'Config', 'queryAvailable',
    function ($scope, $translate, $modalInstance, Config, queryAvailable) {
      const T = $translate.instant;

      let config = { ucUrl: '', regions: [{}] };
      if (Config.exists()) {
        try {
          config = Config.load(false);
          if (config.regions === null && !queryAvailable) {
            config.regions = [{}];
          }
        } catch (e) {
          // do nothing;
        }
      }

      angular.extend($scope, {
        editRegions: editRegions,
        queryAvailable: queryAvailable,
        ucUrl: config.ucUrl,
        regions: config.regions,
        addRegion: addRegion,
        removeRegion: removeRegion,
        onSubmit: onSubmit,
        cancel: cancel,
      });

      function editRegions() {
        return $scope.regions && $scope.regions.length || !queryAvailable;
      }

      function addRegion() {
        if ($scope.regions === null) {
          $scope.regions = [];
        }
        $scope.regions.push({});
      }

      function removeRegion(index) {
        if ($scope.regions === null) {
          $scope.regions = [];
        }
        $scope.regions.splice(index, 1);
      }

      function onSubmit(form) {
        if (!form.$valid) return false;

        let ucUrl = $scope.ucUrl;
        let regions = null;
        if (editRegions()) {
          regions = angular.copy($scope.regions);
        }
        Config.save(ucUrl, regions);
        cancel();
      }

      function cancel() {
        $modalInstance.dismiss('close');
      }
    }
  ]);
