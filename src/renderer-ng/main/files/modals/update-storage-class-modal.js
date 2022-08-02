import angular from 'angular'

import webModule from '@/app-module/web'

import NgQiniuClient from '@/components/services/ng-qiniu-client'
import { TOAST_FACTORY_NAME as Toast } from '@/components/directives/toast-list'
import safeApply from '@/components/services/safe-apply'

const UPDATE_STORAGE_CLASS_MODAL_CONTROLLER_NAME = 'updateStorageClassModalCtrl'

webModule
  .controller(UPDATE_STORAGE_CLASS_MODAL_CONTROLLER_NAME, [
    '$scope',
    '$uibModalInstance',
    '$translate',
    '$timeout',
    NgQiniuClient,
    'item',
    'currentInfo',
    'qiniuClientOpt',
    Toast,
    safeApply,
    'callback',
    function(
      $scope,
      $modalInstance,
      $translate,
      $timeout,
      QiniuClient,
      item,
      currentInfo,
      qiniuClientOpt,
      Toast,
      safeApply,
      callback,
    ) {
      const T = $translate.instant;
      angular.extend($scope, {
        currentInfo: currentInfo,
        item: item,
        path: `kodo://${currentInfo.bucketName}/${currentInfo.key}${item.name}`,
        currentStorageClassName: '',
        currentStorageClassValue: '',
        storageClassOptions: [],
        updateStorageClassFormData: {
          storageClassKodoName: '',
        },
        uploadConfirmFormHelper: {
          storageClassBilling: {},
        },
        cancel: cancel,
        onSubmit: onSubmit
      });


      $scope.$watch('updateStorageClassFormData.storageClassKodoName', function () {
        const selectedStorageClass = $scope.storageClassOptions
          .find(item => item.kodoName === $scope.updateStorageClassFormData.storageClassKodoName);
        if (!selectedStorageClass) {
          $scope.uploadConfirmFormHelper.storageClassBilling = {};
          return;
        }
        $scope.uploadConfirmFormHelper.storageClassBilling = selectedStorageClass.billingI18n;
      })

      $timeout(init);

      function init(){
        $scope.isLoading = true;
        QiniuClient.headFile(
          currentInfo.regionId,
          currentInfo.bucketName,
          item.path,
          {
            ...qiniuClientOpt,
            storageClasses: currentInfo.availableStorageClasses,
          },
        )
          .then((info) => {
            $scope.storageClassOptions = currentInfo.availableStorageClasses
              .filter(availableStorageClass => availableStorageClass.kodoName !== info.storageClass);
            const storageClass = currentInfo.availableStorageClasses
              .find(availableStorageClass => availableStorageClass.kodoName === info.storageClass)
            if (!storageClass) {
              $scope.updateStorageClassFormData.storageClassKodoName = 'Standard';
              $scope.currentStorageClassName = undefined;
              return
            }
            $scope.updateStorageClassFormData.storageClassKodoName = $scope.storageClassOptions.length > 0
              ? $scope.storageClassOptions[0].kodoName
              : 'Standard';
            $scope.currentStorageClassName = storageClass.nameI18n;
            $scope.currentStorageClassValue = info.storageClass;
          })
          .finally(() => {
            $scope.isLoading = false;
            safeApply($scope);
          });
      }

      function cancel() {
        $modalInstance.dismiss('close');
      }

      function onSubmit(form1) {
        if(!form1.$valid) return;

        QiniuClient.setStorageClass(
          currentInfo.regionId,
          currentInfo.bucketName,
          item.path,
          $scope.updateStorageClassFormData.storageClassKodoName,
          {
            ...qiniuClientOpt,
            storageClasses: currentInfo.availableStorageClasses,
          },
        )
          .then(() => {
            Toast.success(T('updateStorageClass.success')); //'修改存储类型成功'
            callback();
            cancel();
          });
      }
    }
  ]);

export default UPDATE_STORAGE_CLASS_MODAL_CONTROLLER_NAME
