import fs from 'fs'
import path from 'path'

import webModule from '../../../app-module/web'

import './upload-confirm-modal.css'

const UPLOAD_CONFIRM_MODAL_CONTROLLER_NAME = 'uploadConfirmModalCtrl'

webModule
  .controller(UPLOAD_CONFIRM_MODAL_CONTROLLER_NAME, [
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
      const T = $translate.instant
      const MAX_SHOW_FILES = 200

      const showFiles = items
        .slice(0, MAX_SHOW_FILES)
        .map(f => ({
          path: f,
          isDir: fs.statSync(f).isDirectory(),
          basename: path.basename(f),
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

export default UPLOAD_CONFIRM_MODAL_CONTROLLER_NAME
