import angular from 'angular'
import qiniuPath from 'qiniu-path'

import webModule from '@/app-module/web'

import NgQiniuClient from '@/components/services/ng-qiniu-client'
import * as AuditLog from '@/components/services/audit-log'

const ADD_FOLDER_MODAL_CONTROLLER_NAME = 'addFolderModalCtrl'

webModule
  .controller(ADD_FOLDER_MODAL_CONTROLLER_NAME, [
    '$scope',
    '$uibModalInstance',
    'currentInfo',
    'qiniuClientOpt',
    'callback',
    NgQiniuClient,
    function ($scope, $modalInstance, currentInfo, qiniuClientOpt, callback, QiniuClient) {

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
        const fullPath = qiniuPath.fromQiniuPath(currentInfo.key + folderName + '/');
        QiniuClient.createFolder(currentInfo.regionId, currentInfo.bucketName, fullPath, qiniuClientOpt).then(function () {
          AuditLog.log(
            AuditLog.Action.AddFolder,
            {
              regionId: currentInfo.regionId,
              bucket: currentInfo.bucketName,
              path: fullPath
            },
          );
          callback();
          cancel();
        });
      }
    }
  ]);

export default ADD_FOLDER_MODAL_CONTROLLER_NAME
