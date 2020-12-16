angular.module('web')
  .controller('renameModalCtrl', ['$scope', '$uibModalInstance', '$translate', '$uibModal', 'item', 'isCopy', 'currentInfo', 'moveTo', 'qiniuClientOpt', 'callback', 'QiniuClient', 'Dialog', 'Toast', 'AuditLog',
    function ($scope, $modalInstance, $translate, $modal, item, isCopy, currentInfo, moveTo, qiniuClientOpt, callback, QiniuClient, Dialog, Toast, AuditLog) {
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
          QiniuClient.checkFolderExists(moveTo.regionId, moveTo.bucketName, newPath, qiniuClientOpt).then(function (has) {
            if (has) {
              Dialog.confirm(title, msg1, function (b) {
                if (b) {
                  showMoveFolder(newPath);
                } else {
                  $scope.isLoading = false;
                }
              });
            } else {
              showMoveFolder(newPath);
            }
          }, function (err) {
            $scope.isLoading = false;
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
        });
      }

      function showMoveFolder(newPath) {
        var successMsg = T('rename.success'); //重命名成功
        $modal.open({
          templateUrl: 'main/files/modals/move-modal.html',
          controller: 'moveModalCtrl',
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
                callback();
                cancel();
              };
            }
          }
        }).result.then(angular.noop, angular.noop);
      }
    }
  ]);
