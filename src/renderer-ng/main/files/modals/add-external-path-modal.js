import angular from 'angular'

import webModule from '@/app-module/web'

import NgQiniuClient from '@/components/services/ng-qiniu-client'
import * as AuditLog from '@/components/services/audit-log'
import { TOAST_FACTORY_NAME as Toast } from '@/components/directives/toast-list'

const ADD_EXTERNAL_PATH_MODAL_CONTROLLER_NAME = 'addExternalPathModalCtrl'

webModule
  .controller(ADD_EXTERNAL_PATH_MODAL_CONTROLLER_NAME, [
    '$scope',
    '$uibModalInstance',
    '$translate',
    'callback',
    'ExternalPath',
    NgQiniuClient,
    'currentInfo',
    'regions',
    Toast,
    function ($scope, $modalInstance, $translate, callback, ExternalPath, QiniuClient, currentInfo, regions, Toast) {
      const T = $translate.instant;

      angular.extend($scope, {
        currentInfo: currentInfo,
        regions: regions,
        item: {
            regionId: regions[0].s3Id,
        },
        cancel: cancel,
        onSubmit: onSubmit,
      });

      function cancel() {
        $modalInstance.dismiss('cancel');
      }

      function onSubmit(form) {
        if (!form.$valid) return;

        const item = angular.copy($scope.item);

        const newExternalPath = ExternalPath.new(item.path, item.regionId);
        QiniuClient.listFiles(
          newExternalPath.regionId, newExternalPath.bucketId, newExternalPath.objectPrefix, undefined,
          { preferS3Adapter: true, maxKeys: 1, minKeys: 0, storageClasses: $scope.currentInfo.availableStorageClasses },
        ).then(() => {
          ExternalPath.create(item.path, item.regionId).then(() => {
            AuditLog.log(
              AuditLog.Action.AddExternalPath,
              {
                path: item.path,
                regionId: item.regionId
              },
            );
            callback();
            cancel();
          }).catch((err) => {
            Toast.error(err);
            cancel();
          });
        }).catch((err) => {
          Toast.error(err);
          cancel();
        })
      }
    }
  ]);

export default ADD_EXTERNAL_PATH_MODAL_CONTROLLER_NAME
