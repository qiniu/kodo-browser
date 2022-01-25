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
    'currentInfo',
    'okCallback',
    function (
      $scope,
      $uibModalInstance,
      $translate,
      items,
      currentInfo,
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
        currentInfo,
        isLoading: false,
        files: items,
        showFiles,
        maxShowFiles: MAX_SHOW_FILES,
        storageClassOptions: currentInfo.availableStorageClasses,
        uploadConfirmFormData: {
          isOverwrite: false,
          storageClassName: currentInfo.availableStorageClasses > 0
            ? $scope.storageClassOptions[0].kodoName
            : 'Standard',
        },
        uploadConfirmFormHelper: {
          storageClassBilling: currentInfo.availableStorageClasses > 0
            ? $scope.storageClassOptions[0].billingI18n
            : {},
        },
        ok: ok,
        cancel: cancel,
      })

      $scope.$watch('uploadConfirmFormData.storageClassName', function () {
        const selectedStorageClass = $scope.storageClassOptions
          .find(item => item.kodoName === $scope.uploadConfirmFormData.storageClassKodoName);
        if (!selectedStorageClass) {
          $scope.uploadConfirmFormHelper.storageClassBilling = {};
          return;
        }
        $scope.uploadConfirmFormHelper.storageClassBilling = selectedStorageClass.billingI18n;
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
