import angular from 'angular'

import webModule from '@/app-module/web'

import QiniuClient from '@/components/services/qiniu-client'
import AuditLog from '@/components/services/audit-log'

const ADD_FOLDER_MODAL_CONTROLLER_NAME = 'addFolderModalCtrl'

webModule
  .controller(ADD_FOLDER_MODAL_CONTROLLER_NAME, [
    '$scope',
    '$uibModalInstance',
    'currentInfo',
    'qiniuClientOpt',
    'callback',
    QiniuClient,
    AuditLog,
    function ($scope, $modalInstance, currentInfo, qiniuClientOpt, callback, QiniuClient, AuditLog) {

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

        const folderName = $scope.item.name;
        const fullPath = currentInfo.key + folderName + '/';
        QiniuClient.createFolder(currentInfo.regionId, currentInfo.bucketName, fullPath, qiniuClientOpt).then(function () {
          AuditLog.log('addFolder', {
            regionId: currentInfo.regionId,
            bucket: currentInfo.bucketName,
            path: fullPath
          });
          callback();
          cancel();
        });
      }
    }
  ]);

export default ADD_FOLDER_MODAL_CONTROLLER_NAME
