angular.module('web')
  .controller('addFolderModalCtrl', ['$scope', '$uibModalInstance', 'currentInfo', 'callback', 's3Client',
    function ($scope, $modalInstance, currentInfo, callback, s3Client) {

      angular.extend($scope, {
        currentInfo: currentInfo,
        item: {},
        cancel: cancel,
        onSubmit: onSubmit,
        reg: {
          folderName: /^[^\/]+$/
        }
      });

      function cancel() {
        $modalInstance.dismiss('close');
      }

      function onSubmit(form) {
        if (!form.$valid) return;

        var folderName = $scope.item.name;

        s3Client.createFolder(currentInfo.region, currentInfo.bucket, currentInfo.key + folderName + '/').then(function () {
          callback();
          cancel();
        });

      }
    }
  ]);
