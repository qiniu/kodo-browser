angular.module('web')
  .controller('uploadConfirmModalCtrl', [
    '$scope',
    '$uibModalInstance',
    '$translate',
    'items',
    'okCallback',
    function (
      $scope,
      $uibModalInstance,
      $translate,
      items,
      okCallback,
    ) {
      const fs = require('fs')
      const path = require('path')

      const T = $translate.instant
      const MAX_SHOW_FILES = 200

      const showFiles = items
        .slice(0, MAX_SHOW_FILES)
        .map(f => ({ path: f, isDir: fs.statSync(f).isDirectory() }))
        .map(f => ({
          ...f,
          basename: path.basename(f.path),
        }))


      angular.extend($scope, {
        isLoading: false,
        files: items,
        showFiles,
        maxShowFiles: MAX_SHOW_FILES,
        uploadConfirmFormData: {
          isOverwrite: false,
          storageClassName: 'Standard'
        },
        uploadConfirmFormHelper: {
          storageClassesType: T('uploadModal.storageClassesHelper.Standard')
        },
        ok: ok,
        cancel: cancel,
      })

      $scope.$watch('uploadConfirmFormData.storageClassName', function () {
        $scope.uploadConfirmFormHelper.storageClassesType =
          T(`uploadModal.storageClassesHelper.${$scope.uploadConfirmFormData.storageClassName}`)
      })

      function ok() {
        okCallback({
          files: $scope.files,
          uploadOptions: $scope.uploadConfirmFormData,
        })
        $uibModalInstance.dismiss('close');
      }

      function cancel() {
        $uibModalInstance.dismiss('close');
      }
    }
  ])
