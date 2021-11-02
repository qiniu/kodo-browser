import angular from 'angular'

import webModule from '@/app-module/web'

import QiniuClient from '@/components/services/qiniu-client'
import { DIALOG_FACTORY_NAME as Dialog } from '@/components/services/dialog.s'
import { TOAST_FACTORY_NAME as Toast } from '@/components/directives/toast-list'
import AuditLog from '@/components/services/audit-log'
import safeApply from '@/components/services/safe-apply'

import { moveModalHtmlMapping } from "@template-mappings/main/files/modals"
import moveModalCtrl from './move-modal'

const RENAME_MODAL_CONTROLLER = 'renameModalCtrl'

webModule
  .controller(RENAME_MODAL_CONTROLLER, [
    '$scope',
    '$uibModalInstance',
    '$translate',
    '$uibModal',
    'item',
    'isCopy',
    'currentInfo',
    'moveTo',
    'qiniuClientOpt',
    'callback',
    QiniuClient,
    Dialog,
    Toast,
    AuditLog,
    safeApply,
    function ($scope, $modalInstance, $translate, $modal, item, isCopy, currentInfo, moveTo, qiniuClientOpt, callback, QiniuClient, Dialog, Toast, AuditLog, safeApply) {
      var T = $translate.instant;
      //console.log(item)
      angular.extend($scope, {
        currentInfo: currentInfo,
        moveTo: moveTo,
        item: item,
        isCopy: isCopy,
        keep: {
          name: item.name
        },
        cancel: cancel,
        onSubmit: onSubmit,
        reg: {
          folderName: /^[^\/]+$/
        },
        isLoading: false,
        error_message: null
      });

      function cancel() {
        $modalInstance.dismiss('close');
      }

      function onSubmit(form) {
      if (!form.$valid) return;

        const title = T('whetherCover.title'); //是否覆盖
        const msg1 = T('whetherCover.message1'); //已经有同名目录，是否覆盖?
        const msg2 = T('whetherCover.message2'); //已经有同名文件，是否覆盖?

        if ($scope.item.itemType === 'folder') {
          const newPath = `${moveTo.key == '' ? item.name : (moveTo.key.replace(/(\/$)/, '') + '/' + item.name)}/`;
          if (item.path == newPath) return;

          $scope.isLoading = true;
          QiniuClient.checkFolderExists(moveTo.regionId, moveTo.bucketName, newPath, qiniuClientOpt).then((has) => {
            if (has) {
              Dialog.confirm(title, msg1, function (b) {
                if (b) {
                  showMoveFolder(newPath);
                } else {
                  $scope.isLoading = false;
                  safeApply($scope);
                }
              });
            } else {
              showMoveFolder(newPath);
            }
          }).catch((err) => {
            $scope.isLoading = false;
            safeApply($scope);
          });
        } else {
          const newPath = moveTo.key == '' ? item.name : (moveTo.key.replace(/(\/$)/, '') + '/' + item.name);
          if (item.path == newPath) return;

          $scope.isLoading = true;
          QiniuClient.checkFileExists(moveTo.regionId, moveTo.bucketName, newPath, qiniuClientOpt).then((exists) => {
            if (exists) {
              Dialog.confirm(title, msg2, (b) => {
                if (b) {
                  renameFile(newPath);
                } else {
                  $scope.isLoading = false;
                  safeApply($scope);
                }
              });
            } else {
              renameFile(newPath);
            }
          });
        }
      }

      function renameFile(newPath) {
        var onMsg = T('rename.on'); //正在重命名...
        var successMsg = T('rename.success'); //重命名成功

        Toast.info(onMsg);
        QiniuClient.moveOrCopyFile(currentInfo.regionId, currentInfo.bucketName, item.path, newPath, isCopy, qiniuClientOpt).then(() => {
          Toast.success(successMsg);

          AuditLog.log('moveOrCopyFile', {
            regionId: currentInfo.regionId,
            bucket: currentInfo.bucketName,
            from: item.path,
            to: newPath,
            type: isCopy ? 'copy' : 'move',
            storageClass: item.StorageClass
          });

          callback();
          cancel();
        }).finally(() => {
          $scope.isLoading = false;
          safeApply($scope);
        });
      }

      function showMoveFolder(newPath) {
        var successMsg = T('rename.success'); //重命名成功
        $modal.open({
          templateUrl: moveModalHtmlMapping.path,
          controller: moveModalCtrl,
          backdrop: 'static',
          resolve: {
            items: function () {
              return angular.copy([item]);
            },
            moveTo: function () {
              return angular.copy(moveTo);
            },
            renamePath: function () {
              return newPath;
            },
            isCopy: function () {
              return isCopy;
            },
            fromInfo: function () {
              return angular.copy(currentInfo);
            },
            qiniuClientOpt: () => {
              return angular.copy(qiniuClientOpt);
            },
            callback: function () {
              return function () {
                Toast.success(successMsg);
                $scope.isLoading = false;
                safeApply($scope);
                callback();
                cancel();
              };
            }
          }
        }).result.then(angular.noop, angular.noop);
      }
    }
  ]);

export default RENAME_MODAL_CONTROLLER
