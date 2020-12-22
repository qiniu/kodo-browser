angular.module('web')
  .controller('addBucketModalCtrl', ['$scope', '$uibModalInstance', '$translate', 'callback', 's3Client', 'Const', 'Toast', 'AuditLog', 'regions',
    function ($scope, $modalInstance, $translate, callback, s3Client, Const, Toast, AuditLog, regions) {
      const T = $translate.instant,
            bucketACL = angular.copy(Const.bucketACL);
      angular.extend($scope, {
        regions: regions.filter((region) => !region.cannotCreateBucket),
        bucketACL: [], //angular.copy(Const.bucketACL),
        cancel: cancel,
        onSubmit: onSubmit,
        item: {
          acl: bucketACL[0].acl,
          region: regions[0].id,
        },
        reg: /^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$/i,
        openURL: function (v) {
          openExternal(v)
        }
      });

      i18nBucketACL();

      function i18nBucketACL() {
        const acls = angular.copy(Const.bucketACL);
        angular.forEach(acls, function (n) {
          n.label = T('aclType.' + n.acl);
        });
        $scope.bucketACL = acls;
      }

      function cancel() {
        $modalInstance.dismiss('cancel');
      }

      function onSubmit(form) {
        if (!form.$valid) return;

        var item = angular.copy($scope.item);
        s3Client.createBucket(item.region, item.name, item.acl).then((result) => {
          AuditLog.log('addBucket', {
            regionId: item.region,
            name: item.name,
            acl: item.acl,
          });
          callback();
          cancel();
        }, (err) => {
          console.error(err);
          Toast.error(err);
        });
      }
    }
  ]);
