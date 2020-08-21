angular.module('web')
  .controller('moveModalCtrl', ['$scope', '$uibModalInstance', '$translate', '$timeout', 'items', 'isCopy', 'renamePath', 'fromInfo', 'moveTo', 'callback', 's3Client', 'Toast', 'safeApply', 'AuditLog',
    function ($scope, $modalInstance, $translate, $timeout, items, isCopy, renamePath, fromInfo, moveTo, callback, s3Client, Toast, safeApply, AuditLog) {
      const path = require("path"),
            filter = require("array-filter"),
            map = require("array-map"),
            T = $translate.instant;

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
          region: moveTo.region,
          bucket: moveTo.bucket,
          key: moveTo.key,
        },
        canMove: false
      });

      //$scope.originPath = 'kodo://'+currentInfo.bucket+'/'+currentInfo.key;
      start();

      function stop() {
        //$modalInstance.dismiss('cancel');
        $scope.isStop = true;
        s3Client.stopCopyFiles();
      }

      function cancel() {
        $modalInstance.dismiss('cancel');
      }

      function start() {
        $scope.isStop = false;
        $scope.step = 2;

        var target = angular.copy($scope.moveTo);
        var items = filter(angular.copy($scope.items), (item) => {
          if (fromInfo.bucket !== target.bucket) {
            return true;
          }
          var entries = filter([target.key, item.name], (name) => { return name });
          var path = map(entries, (name) => { return name.replace(/^\/*([^/].+[^/])\/*$/, '$1'); }).join('/');
          if (item.isFolder) {
            return item.path !== path + '/';
          }
          return item.path !== path;
        });

        if (items.length === 0) {
          $timeout(() => {
            cancel();
            callback();
          });
          return;
        }

        angular.forEach(items, (n) => {
          //n.region = currentInfo.region;
          n.bucket = fromInfo.bucket;
        });

        AuditLog.log('moveOrCopyFilesStart', {
          regionId: fromInfo.region,
          from: map(items, (item) => {
            return { bucket: item.bucket, path: item.path };
          }),
          to: {
            bucket: target.bucket,
            path: target.key
          },
          type: isCopy ? 'copy' : 'move'
        });

        //复制 or 移动
        s3Client.copyFiles(fromInfo.region, items, target, (prog) => {
          //进度
          $scope.progress = angular.copy(prog);
          safeApply($scope);
        }, !isCopy, renamePath).then((terr) => {
          //结果
          $scope.step = 3;
          $scope.terr = terr;
          angular.forEach(terr, (terr1) => {
            switch (terr1.error.stage) {
              case 'copy':
                if (terr1.error.code === 'AccessDenied') {
                  Toast.error(T('permission.denied'));
                }
                break;
              case 'delete':
                if (terr1.error.code === 'AccessDenied') {
                  terr1.error.translated_message = T('permission.denied.move.error_when_delete', terr1.error);
                  Toast.error(terr1.error.translated_message);
                }
                break;
            }
          });
          AuditLog.log('moveOrCopyFilesDone');
          callback();
        });
      }
    }
  ]);
