import angular from 'angular'

import webModule from '@/app-module/web'

import safeApply from '@/components/services/safe-apply'
import NgQiniuClient from '@/components/services/ng-qiniu-client'
import * as AuditLog from '@/components/services/audit-log'

const UPDATE_STORAGE_CLASSES_MODAL_CONTROLLER_NAME = 'updateStorageClassesModalCtrl'

webModule
  .controller(UPDATE_STORAGE_CLASSES_MODAL_CONTROLLER_NAME, [
    '$scope',
    '$uibModalInstance',
    '$timeout',
    'items',
    'currentInfo',
    'callback',
    NgQiniuClient,
    'qiniuClientOpt',
    safeApply,
    function (
      $scope,
      $modalInstance,
      $timeout,
      items,
      currentInfo,
      callback,
      QiniuClient,
      qiniuClientOpt,
      safeApply,
    ) {
      angular.extend($scope, {
        items: items,
        currentInfo: currentInfo,
        storageClassOptions: currentInfo.availableStorageClasses,
        updateStorageClassFormData: {
          storageClassKodoName: currentInfo.availableStorageClasses > 0
            ? $scope.storageClassOptions[0].kodoName
            : 'Standard',
        },
        uploadConfirmFormHelper: {
          storageClassBilling: currentInfo.availableStorageClasses > 0
            ? $scope.storageClassOptions[0].billingI18n
            : {},
        },
        step : 1,
        stop: stop,
        close: close,
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

      function stop() {
        $scope.isStop = true;
        QiniuClient.stopSetStorageClassOfFiles();
      }

      function close(){
        $modalInstance.dismiss('cancel');
      }

      function onSubmit(form1) {
        if(!form1.$valid) {
          return;
        }

        $scope.isStop = false;
        $scope.step = 2;
        const newStorageClass = $scope.updateStorageClassFormData.storageClassKodoName;

        AuditLog.log(AuditLog.Action.SetStorageClassOfFiles, {
          regionId: currentInfo.regionId,
          bucket: currentInfo.bucketName,
          paths: items.map((item) => item.path),
          updateTo: newStorageClass,
        });

        QiniuClient.setStorageClassOfFiles(
          currentInfo.regionId,
          currentInfo.bucketName,
          items,
          newStorageClass,
          (prog) => {
            //进度
            $scope.progress = angular.copy(prog);
            safeApply($scope);
          },
          {
            ...qiniuClientOpt,
            storageClasses: currentInfo.availableStorageClasses,
          },
        ).then((terr) => {
          //结果
          $scope.step = 3;
          $scope.terr = terr;
          if (!terr || terr.length === 0) {
            AuditLog.log(AuditLog.Action.SetStorageClassOfFilesDone);
          }
          callback();
        });
      }
    }
  ]);

export default UPDATE_STORAGE_CLASSES_MODAL_CONTROLLER_NAME
