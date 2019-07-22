angular.module('web')
  .controller('crcModalCtrl', ['$scope', '$q', '$uibModalInstance', 'item', 'currentInfo', 's3Client', 'safeApply',
    function ($scope, $q, $modalInstance, item, currentInfo, s3Client, safeApply) {

      angular.extend($scope, {
        item: item,
        info: {},
        currentInfo: currentInfo,
        openDoc: openDoc,
        cancel: cancel
      });

      function cancel() {
        $modalInstance.dismiss('close');
      }

      function openDoc() {
        openExternal('https://developer.qiniu.com')
      }

      init();

      function init() {
        s3Client.getFileInfo(
          currentInfo.region,
          currentInfo.bucket,
          item.path
        ).then(function (data) {
          $scope.info = data;
          safeApply($scope);
        });
      }

    }
  ]);
