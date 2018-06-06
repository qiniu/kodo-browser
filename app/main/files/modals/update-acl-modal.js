angular.module('web')
  .controller('updateACLModalCtrl', ['$scope','$uibModalInstance','$translate','item','currentInfo','s3Client','Toast','safeApply',
    function ($scope, $modalInstance, $translate, item, currentInfo, s3Client, Toast,safeApply) {
      var T = $translate.instant;

      angular.extend($scope, {
        currentInfo: currentInfo,
        item: item,
        cancel: cancel,
        onSubmit: onSubmit,
        info: {
          acl: 'default'
        }
      });

      s3Client.getACL(currentInfo.region, currentInfo.bucket, item.path).then(function(res){
        $scope.info.acl = res.acl||'default';
        safeApply($scope);
      });

      function cancel() {
        $modalInstance.dismiss('close');
      }

      function onSubmit(form) {
        if (!form.$valid)return;
        var acl = $scope.info.acl;
        s3Client.updateACL(currentInfo.region, currentInfo.bucket, item.path, acl).then(function(res){
          Toast.success(T('acl.update.success')); //'修改ACL权限成功'
          cancel();
        });
      }
    }])
;
