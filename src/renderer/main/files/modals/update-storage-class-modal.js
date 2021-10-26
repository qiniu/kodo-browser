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
    function($scope, $modalInstance, $translate, $timeout, QiniuClient, item, currentInfo, qiniuClientOpt, Toast, safeApply, callback) {
      const T = $translate.instant;
      angular.extend($scope, {
        currentInfo: currentInfo,
        item: item,
        path: `kodo://${currentInfo.bucketName}/${currentInfo.key}${item.name}`,
        info: {
          type: 1,
          name: T('storageClassesType.standard'),
        },
        cancel: cancel,
        onSubmit: onSubmit
      });

      $timeout(init);

      function init(){
        $scope.isLoading = true;
        QiniuClient.headFile(currentInfo.regionId, currentInfo.bucketName, item.path, qiniuClientOpt).then((info) => {
          switch (info.storageClass.toLowerCase()) {
          case 'standard':
            $scope.info.type = 1;
            $scope.info.updateTo = 'InfrequentAccess';
            break;
          case 'infrequentaccess':
            $scope.info.type = 2;
            $scope.info.updateTo = 'Standard';
            break;
          case 'glacier':
            $scope.info.type = 3;
            $scope.info.updateTo = 'Standard';
            break;
          }
          $scope.info.name = T(`storageClassesType.${info.storageClass.toLowerCase()}`);
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

        QiniuClient.setStorageClass(currentInfo.regionId, currentInfo.bucketName, item.path, $scope.info.updateTo, qiniuClientOpt).then(() => {
          Toast.success(T('updateStorageClass.success')); //'修改存储类型成功'
          callback();
          cancel();
        });
      }
    }
  ]);

export default UPDATE_STORAGE_CLASS_MODAL_CONTROLLER_NAME
