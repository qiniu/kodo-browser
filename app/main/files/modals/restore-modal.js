angular.module('web')
  .controller('restoreModalCtrl', ['$scope', '$uibModalInstance', '$translate', '$timeout', 'QiniuClient', 'item', 'currentInfo', 'qiniuClientOpt', 'Toast', 'safeApply',
    function($scope, $modalInstance, $translate, $timeout, QiniuClient, item, currentInfo, qiniuClientOpt, Toast, safeApply) {
      const T = $translate.instant;
      angular.extend($scope, {
        currentInfo: currentInfo,
        item: item,
        info: {
          days: 1,
          msg: null
        },
        cancel: cancel,
        onSubmit: onSubmit
      });

      $timeout(init);

      function init(){
        $scope.isLoading = true;
        QiniuClient.getFrozenInfo(currentInfo.regionId, currentInfo.bucketName, item.path, qiniuClientOpt).then((data) => {
          switch (data.status.toLowerCase()) {
          case 'frozen':
            $scope.info.type = 1;
            // $scope.info.msg = null;
            break;
          case 'unfreezing':
            $scope.info.type = 2;
            // $scope.info.msg = '正在恢复中，请耐心等待！';
            break;
          case 'unfrozen':
            $scope.info.type = 3;
            $scope.info.expiry_date = data['expiry-date'];
            // $scope.info.msg = '可读截止时间：'+ info['expiry-date']
            break;
          }
        }).finally(() => {
          $scope.isLoading = false;
          safeApply($scope);
        });
      }

      function cancel() {
        $modalInstance.dismiss('close');
      }

      function onSubmit(form1) {
        if(!form1.$valid) return;

        const days = $scope.info.days;

        Toast.info(T('restore.on')); //'提交中...'
        QiniuClient.restoreFile(currentInfo.regionId, currentInfo.bucketName, item.path, days, qiniuClientOpt).then(() => {
          Toast.success(T('restore.success')); //'恢复请求已经提交'
          cancel();
        });
      }
    }])
;
