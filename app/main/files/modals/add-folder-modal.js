angular.module('web')
  .controller('addFolderModalCtrl', ['$scope', '$uibModalInstance', 'currentInfo', 'callback', 'osClient',
    function ($scope, $modalInstance, currentInfo, callback, osClient) {

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

        osClient.createFolder(currentInfo.region, currentInfo.bucket, currentInfo.key + folderName + '/').then(function () {
          callback();
          cancel();
        });

      }
    }
  ]);