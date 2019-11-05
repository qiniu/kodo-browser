angular.module('web')
  .controller('addBucketModalCtrl', ['$scope', '$uibModalInstance', '$translate', 'callback', 's3Client', 'Const', 'Config', 'AuthInfo',
    function ($scope, $modalInstance, $translate, callback, s3Client, Const, Config, AuthInfo) {
      const T = $translate.instant,
            bucketACL = angular.copy(Const.bucketACL),
            regions = angular.copy(Config.load(AuthInfo.usePublicCloud()).regions),
            storageClassesMap = {};
      angular.forEach(regions, function (n) {
        storageClassesMap[n.id] = n.storageClasses
      });

      angular.extend($scope, {
        bucketACL: [], //angular.copy(Const.bucketACL),
        regions: regions,
        cancel: cancel,
        onSubmit: onSubmit,
        storageClasses: [],
        item: {
          acl: bucketACL[0].acl,
          region: regions[0].id,
          storageClass: 'Standard'
        },
        reg: /^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$/i,
        onRegionChanged: onRegionChanged,
        openURL: function (v) {
          openExternal(v)
        }
      });

      i18nStorageClassesType();
      i18nBucketACL();

      function i18nBucketACL() {
        const acls = angular.copy(Const.bucketACL);
        angular.forEach(acls, function (n) {
          n.label = T('aclType.' + n.acl);
        });
        $scope.bucketACL = acls;
      }

      function i18nStorageClassesType() {
        const acls = angular.copy(storageClassesMap[$scope.item.region]);
        angular.forEach(acls, function (n) {
          n.name = T('storageClassesType.' + n.value.toLowerCase())
        });
        $scope.storageClasses = acls;
      }

      function onRegionChanged() {
        i18nStorageClassesType();
        $scope.item.storageClass = 'Standard';
      }

      function cancel() {
        $modalInstance.dismiss('cancel');
      }

      function onSubmit(form) {
        if (!form.$valid) return;

        var item = angular.copy($scope.item);

        s3Client.createBucket(item.region, item.name, item.acl, item.storageClass).then(function (result) {
          callback();
          cancel();
        });
      }
    }
  ]);
