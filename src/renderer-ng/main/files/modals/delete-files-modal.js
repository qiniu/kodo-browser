import angular from 'angular'

import webModule from '@/app-module/web'

import NgQiniuClient from '@/components/services/ng-qiniu-client'
import safeApply from '@/components/services/safe-apply'
import * as AuditLog from '@/components/services/audit-log'

const DELETE_FILES_MODAL_CONTROLLER = 'deleteFilesModalCtrl'

webModule
  .controller(DELETE_FILES_MODAL_CONTROLLER, [
    '$scope',
    '$q',
    '$uibModalInstance',
    '$timeout',
    'items',
    'currentInfo',
    'callback',
    NgQiniuClient,
    'qiniuClientOpt',
    safeApply,
    function ($scope, $q, $modalInstance, $timeout, items, currentInfo, callback, QiniuClient, qiniuClientOpt, safeApply) {
      angular.extend($scope, {
        items: items,

        currentInfo:currentInfo,
        step : 1,
        start: start,
        stop: stop,
        close: close
      });

      function stop() {
        //$modalInstance.dismiss('cancel');
        $scope.isStop = true;
        QiniuClient.stopDeleteFiles();
      }
      function close(){
        $modalInstance.dismiss('cancel');
      }

      function start(){
        $scope.isStop = false;
        $scope.step = 2;

        AuditLog.log(AuditLog.Action.DeleteFiles, {
          regionId: currentInfo.regionId,
          bucket: currentInfo.bucketName,
          paths: items.map((item) => item.path),
        });

        QiniuClient.deleteFiles(currentInfo.regionId, currentInfo.bucketName, items, (prog) => {
          //进度
          $scope.progress = angular.copy(prog);
          safeApply($scope);
        }, {
            ...qiniuClientOpt,
            storageClasses: $scope.currentInfo.availableStorageClasses,
        }).then((terr) => {
          //结果
          $scope.step = 3;
          $scope.terr = terr;
          if (!terr || terr.length === 0) {
            AuditLog.log(AuditLog.Action.DeleteFilesDone);
          }
          callback();
        });
      }
    }
  ]);

export default DELETE_FILES_MODAL_CONTROLLER
