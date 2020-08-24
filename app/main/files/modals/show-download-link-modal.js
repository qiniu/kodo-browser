angular.module('web')
  .controller('showDownloadLinkModalCtrl', ['$scope', '$q','$translate', '$uibModalInstance', 'item', 'currentInfo', 's3Client', 'Toast',
    function ($scope, $q, $translate, $modalInstance, item, currentInfo, s3Client, Toast) {
      const { clipboard } = require('electron');
      var T = $translate.instant;

      angular.extend($scope, {
        item: item,
        currentInfo: currentInfo,
        info: {
          sec: 600,
          url: null,
        },
        cancel: cancel,
        onSubmit: onSubmit,
        copyDownloadLink: copyDownloadLink,
      });

      function cancel() {
        $modalInstance.dismiss('close');
      }

      function onSubmit(form1){
        if(!form1.$valid) return;

        s3Client.signatureUrl(currentInfo.region, currentInfo.bucket, item.path, $scope.info.sec).then((url) => {
          $scope.info.url = url;
        });
      }

      function copyDownloadLink() {
        clipboard.writeText($scope.info.url);
        Toast.success(T("copy.successfully")); //'复制成功'
      }
    }
  ]);
