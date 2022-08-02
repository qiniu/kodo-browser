import angular from 'angular'

import webModule from '@/app-module/web'

import NgQiniuClient from '@/components/services/ng-qiniu-client'
import { TOAST_FACTORY_NAME as Toast } from '@/components/directives/toast-list'
import safeApply from '@/components/services/safe-apply'
import * as AuditLog from '@/components/services/audit-log'

const MOVE_MODAL_CONTROLLER_NAME = 'moveModalCtrl'

webModule
  .controller(MOVE_MODAL_CONTROLLER_NAME, [
    '$scope',
    '$uibModalInstance',
    '$translate',
    '$timeout',
    'items',
    'isCopy',
    'renamePath',
    'fromInfo',
    'moveTo',
    'qiniuClientOpt',
    'callback',
    NgQiniuClient,
    Toast,
    safeApply,
    function ($scope, $modalInstance, $translate, $timeout, items, isCopy, renamePath, fromInfo, moveTo, qiniuClientOpt, callback, QiniuClient, Toast, safeApply) {
      const T = $translate.instant;

      angular.extend($scope, {
        renamePath: renamePath,
        fromInfo: fromInfo,
        items: items,
        isCopy: isCopy,
        step: 2,

        cancel: cancel,
        start: start,
        stop: stop,

        moveTo: {
          region: moveTo.regionId,
          bucket: moveTo.bucketName,
          key: moveTo.key,
        },
      });

      start();

      function stop() {
        //$modalInstance.dismiss('cancel');
        $scope.isStop = true;
        QiniuClient.stopMoveOrCopyFiles();
      }

      function cancel() {
        $modalInstance.dismiss('cancel');
      }

      function start() {
        $scope.isStop = false;
        $scope.step = 2;
        safeApply($scope);

        var target = angular.copy($scope.moveTo);
        var items = angular.copy($scope.items).filter((item) => {
          if (fromInfo.bucketName !== target.bucket) {
            return true;
          }
          var entries = [target.key, item.name].filter((name) => name);
          var path = entries.map((name) => name.replace(/^\/*([^/].+[^/])\/*$/, '$1'));
          if (item.itemType === 'folder') {
            return item.path !== path + '/';
          }
          return item.path !== path;
        });

        if (items.length === 0) {
          cancel();
          callback();
          return;
        }

        AuditLog.log(AuditLog.Action.MoveOrCopyFilesStart, {
          regionId: fromInfo.regionId,
          from: items.map((item) => {
            return { bucket: item.bucket, path: item.path };
          }),
          to: {
            bucket: target.bucket,
            path: target.key
          },
          type: isCopy ? 'copy' : 'move'
        });

        //复制 or 移动
        QiniuClient.moveOrCopyFiles(
          fromInfo.regionId,
          items,
          target,
          (prog) => {
            //进度
            $scope.progress = angular.copy(prog);
            safeApply($scope);
          },
          isCopy,
          renamePath,
          {
            ...qiniuClientOpt,
            storageClasses: $scope.fromInfo.availableStorageClasses,
          }
        )
          .then((terr) => {
            //结果
            $scope.step = 3;
            $scope.terr = terr;
            AuditLog.log(AuditLog.Action.MoveOrCopyFilesStartDone);
            callback();
            safeApply($scope);
          });
      }
    }
  ]);

export default MOVE_MODAL_CONTROLLER_NAME
