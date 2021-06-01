angular.module('web')
  .controller('showDownloadLinksModalCtrl', ['$scope', '$timeout', '$translate', '$uibModalInstance', 'safeApply', 'QiniuClient', 'items', 'current', 'domains', 'showDomains', 'Dialog', 'Toast', 'Domains', 'qiniuClientOpt',
    function($scope, $timeout, $translate, $modalInstance, safeApply, QiniuClient, items, current, domains, showDomains, Dialog, Toast, Domains, qiniuClientOpt) {
      const T = $translate.instant,
            fs = require('fs'),
            path = require('path'),
            csvStringify = require('csv-stringify');

      initCurrentDomain(domains);

      angular.extend($scope, {
        items: items,
        current: current,
        domains: domains,
        showDomains: showDomains,
        info: { sec: 600 },
        cancel: cancel,
        onSubmit: onSubmit,
      });

      function cancel() {
        $modalInstance.dismiss('close');
      }

      function initCurrentDomain(domains) {
        let found = false;
        if (current.domain !== null) {
          domains.forEach((domain) => {
            if (current.domain.name() === domain.name()) {
              current.domain = domain;
              found = true;
            }
          });
        }
        if (!found) {
          domains.forEach((domain) => {
            if (domain.default()) {
              current.domain = domain;
              found = true;
            }
          });
        }
        if (!found) {
          current.domain = domains[0];
        }
      }

      function onSubmit(form1){
        if(!form1.$valid) return;
        const lifetime = $scope.info.sec;

        Dialog.showDownloadDialog((folderPaths) => {
          if (!folderPaths || folderPaths.length == 0) {
            return;
          }
          const targetDirectory = folderPaths[0].replace(/(\/*$)/g, '');
          cancel();

          const fileName = `kodo-browser-download-links-${moment().utc().format('YYYYMMDDHHmmSS')}`;
          let filePath = path.join(targetDirectory, `${fileName}.csv`);
          for (let i = 1; fs.existsSync(filePath); i++) {
            filePath = path.join(targetDirectory, `${fileName}.${i}.csv`);
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
          });
          csvStringifier.on('finish', function() {
            csvFile.end();
            Toast.success(T('exportDownloadLinks.message', {path: filePath}), 5000);
          });
          csvStringifier.write(['BucketName', 'ObjectName', 'URL']);
          const promises = [];
          loopItems(current.info.regionId, current.info.bucketName, items,
            (item) => {
              promises.push($scope.current.domain.signatureUrl(item.path, lifetime, qiniuClientOpt).then((url) => {
                              csvStringifier.write([current.info.bucketName, item.path.toString(), url.toString()]);
                            }));
            }, () => {
              Promise.all(promises).then(() => { csvStringifier.end(); });
            });
        });
      }

      function refreshDomains() {
        const info = $scope.current.info;
        Domains.list(info.regionId, info.bucketName, info.bucketGrantedPermission).
                then((domains) => {
                  $scope.domains = domains;
                  initCurrentDomain(domains);
                  safeApply($scope);
                });
      }

      function loopItems(region, bucket, items, eachCallback, doneCallback) {
        let waitForDirs = 0;
        loopItemsInDirectory(items, eachCallback, doneCallback);

        function loopItemsInDirectory(items, eachCallback, doneCallback) {
          items.forEach((item) => {
            if (item.itemType === 'folder') {
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
          QiniuClient
            .listFiles(
              region, bucket, item.path, marker,
              angular.extend(qiniuClientOpt, { maxKeys: 1000, minKeys: 0 }),
            )
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
