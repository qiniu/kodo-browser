angular.module('web')
  .controller('moveModalCtrl', ['$scope', '$uibModalInstance', '$timeout', 'items', 'isCopy', 'renamePath', 'fromInfo', 'moveTo', 'callback', 's3Client', 'Toast', 'AuthInfo', 'safeApply', 'AuditLog',
    function ($scope, $modalInstance, $timeout, items, isCopy, renamePath, fromInfo, moveTo, callback, s3Client, Toast, AuthInfo, safeApply, AuditLog) {
      const path = require("path");
      const filter = require("array-filter");
      const map = require("array-map");

      var authInfo = AuthInfo.get();

      angular.extend($scope, {
        renamePath: renamePath,
        fromInfo: fromInfo,
        items: items,
        isCopy: isCopy,
        step: 2,

        cancel: cancel,
        start: start,
        stop: stop,

        // reg: {
        //   folderName: /^[^\/]+$/
        // },
        // s3FileConfig: {
        //   id: authInfo.id,
        //   secret: authInfo.secret,
        //   region: currentInfo.region,
        //   bucket: currentInfo.bucket,
        //   key: currentInfo.key
        // },
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
          AuditLog.log('moveOrCopyFilesDone');
          callback();
        });
      }
    }
  ]);
