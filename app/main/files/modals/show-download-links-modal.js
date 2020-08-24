angular.module('web')
  .controller('showDownloadLinksModalCtrl', ['$scope', '$timeout', '$translate', '$uibModalInstance', 'items', 'currentInfo', 's3Client', 'Toast',
    function ($scope, $timeout, $translate, $modalInstance, items, currentInfo, s3Client, Toast) {
      const T = $translate.instant,
            fs = require('fs'),
            path = require('path'),
            each = require('array-each'),
            csvStringify = require('csv-stringify'),
            downloadsFolder = require("downloads-folder");

      angular.extend($scope, {
        items: items,
        currentInfo: currentInfo,
        sec: 600,
        cancel: cancel,
        onSubmit: onSubmit,
      });

      function cancel() {
        $modalInstance.dismiss('close');
      }

      function onSubmit(form1){
        if(!form1.$valid) return;
        const lifetime = $scope.sec;

        const fileName = `kodo-browser-download-links-${moment().utc().format('YYYYMMDDHHmmSS')}`;
        let filePath = path.join(downloadsFolder(), `${fileName}.csv`);
        for (let i = 1; fs.existsSync(filePath); i++) {
          filePath = path.join(downloadsFolder(), `${fileName}.${i}.csv`);
        }
        const csvFile = fs.createWriteStream(filePath);
        const csvStringifier = csvStringify();

        csvStringifier.on('readable', function() {
          let row;
          while(row = csvStringifier.read()) {
            csvFile.write(row);
          }
        });
        csvStringifier.on('error', function(err) {
          Toast.error(err.message)
          cancel();
        });
        csvStringifier.on('finish', function() {
          csvFile.end();
          Toast.success(T('exportDownloadLinks.message', {path: filePath}), 5000);
          cancel();
        });
        csvStringifier.write(['BucketName', 'ObjectName', 'URL']);
        const promises = [];
        loopItems(currentInfo.region, currentInfo.bucket, items,
          (item) => {
            promises.push(new Promise((resolve, reject) => {
              s3Client.signatureUrl(currentInfo.region, currentInfo.bucket, item.path, lifetime).then((url) => {
                csvStringifier.write([currentInfo.bucketName, item.path, url]);
                resolve();
              });
            }));
          }, () => {
            Promise.all(promises).then(() => {
              csvStringifier.end();
            })
          });
      }

      function loopItems(region, bucket, items, eachCallback, doneCallback) {
        let waitForDirs = 0;
        loopItemsInDirectory(items, eachCallback, doneCallback);

        function loopItemsInDirectory(items, eachCallback, doneCallback) {
          each(items, (item) => {
            if (item.isFolder) {
              waitForDirs += 1;
              loadFilesFromDirectory(
                item,
                (items) => {
                  loopItemsInDirectory(items, eachCallback, doneCallback);
                },
                () => {
                  waitForDirs--;
                  if (waitForDirs == 0) {
                    doneCallback();
                  }
                })
            } else {
              eachCallback(item);
            }
          });
          if (waitForDirs == 0) {
            doneCallback();
          }
        }

        function loadFilesFromDirectory(item, handleItems, doneCallback, marker) {
          s3Client
            .listFiles(region, bucket, item.path, marker)
            .then((result) => {
                handleItems(result.data || []);
                if (result.marker) {
                  loadFilesFromDirectory(item, handleItems, doneCallback, result.marker);
                } else {
                  doneCallback();
                }
            });
        }
      }
    }
  ]);
