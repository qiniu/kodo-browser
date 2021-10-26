import angular from 'angular'

import webModule from '@/app-module/web'

import NgQiniuClient from '@/components/services/ng-qiniu-client'
import safeApply from '@/components/services/safe-apply'
import * as AuditLog from '@/components/services/audit-log'

const RESTORE_FILES_MODAL_CONTROLLER_NAME = 'restoreFilesModalCtrl'

webModule
  .controller(RESTORE_FILES_MODAL_CONTROLLER_NAME, [
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
        info: {
          days: 1,
        },
        step : 1,
        stop: stop,
        close: close,
        onSubmit: onSubmit
      });

      function stop() {
        $scope.isStop = true;
        QiniuClient.stopRestoreFiles();
      }

      function close(){
        $modalInstance.dismiss('cancel');
      }

      function onSubmit(form1) {
      if(!form1.$valid) return;

        $scope.isStop = false;
        $scope.step = 2;
        const days = $scope.info.days;

        AuditLog.log(AuditLog.Action.RestoreFiles, {
          regionId: currentInfo.regionId,
          bucket: currentInfo.bucketName,
          paths: items.map((item) => item.path),
          days: days,
        });

        QiniuClient.restoreFiles(currentInfo.regionId, currentInfo.bucketName, items, days, (prog) => {
          //进度
          $scope.progress = angular.copy(prog);
          safeApply($scope);
        }, qiniuClientOpt).then((terr) => {
          //结果
          $scope.step = 3;
          $scope.terr = terr;
          if (!terr || terr.length === 0) {
            AuditLog.log(AuditLog.Action.RestoreFilesDone);
          }
          callback();
        });
      }
    }
  ]);

export default RESTORE_FILES_MODAL_CONTROLLER_NAME
