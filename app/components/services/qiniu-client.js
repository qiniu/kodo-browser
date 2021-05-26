angular.module('web').factory('QiniuClient', [
  '$q',
  '$rootScope',
  '$translate',
  '$timeout',
  '$state',
  'Toast',
  'Config',
  'AuthInfo',
  'settingsSvs',
  function ($q, $rootScope, $translate, $timeout, $state, Toast, Config, AuthInfo, settingsSvs) {
    const { Qiniu, Region, KODO_MODE, S3_MODE, RegionService } = require('kodo-s3-adapter-sdk'),
      path = require('path'),
      { Semaphore } = require('semaphore-promise'),
      T = $translate.instant,
      kodoAdaptersCache = {},
      s3AdaptersCache = {},
      regionServicesCache = {};

    return {
      isQueryRegionAPIAvaiable: isQueryRegionAPIAvaiable,
      listAllBuckets: listAllBuckets,
      createBucket: createBucket,
      deleteBucket: deleteBucket,

      listFiles: listFiles,
      listDomains: listDomains,
      createFolder: createFolder,

      checkFileExists: checkFileExists,
      checkFolderExists: checkFolderExists,
      getFrozenInfo: getFrozenInfo,
      headFile: headFile,

      getContent: getContent,
      saveContent: saveContent,

      //重命名
      moveOrCopyFile: moveOrCopyFile,

      //复制，移动
      moveOrCopyFiles: moveOrCopyFiles,
      stopMoveOrCopyFiles: stopMoveOrCopyFiles,

      //解冻
      restoreFile: restoreFile,

      //删除
      deleteFiles: deleteFiles,
      stopDeleteFiles: stopDeleteFiles,

      parseKodoPath: parseKodoPath,
      signatureUrl: signatureUrl,
      getRegions: getRegions,
      clientBackendMode: clientBackendMode,
      clearAllCache: clearAllCache,
    };

    function isQueryRegionAPIAvaiable(ucUrl) {
      return new Promise((resolve) => {
        const option = {
                         accessKey: '', bucketName: '', ucUrl: ucUrl,
                         requestCallback: debugRequest(KODO_MODE), responseCallback: debugResponse(KODO_MODE),
                       };
        Region.query(option).then(() => {
          resolve(true);
        }, (err) => {
          if (err.res && err.res.statusCode === 404) {
            resolve(false);
          } else if (err.code && (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED')) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    }

    function listAllBuckets(opt) {
      return new Promise((resolve, reject) => {
        getDefaultClient(opt).listBuckets().then(resolve).catch((err) => {
          handleError(err);
          reject(err);
        });
      });
    }

    function createBucket(region, bucket, opt) {
      return new Promise((resolve, reject) => {
        getDefaultClient(opt).createBucket(region, bucket).then(resolve).catch((err) => {
          handleError(err);
          reject(err);
        });
      });
    }

    function deleteBucket(region, bucket, opt) {
      return new Promise((resolve, reject) => {
        getDefaultClient(opt).deleteBucket(region, bucket).then(resolve).catch((err) => {
          handleError(err);
          reject(err);
        });
      });
    }

    function listFiles(region, bucket, key, marker, opt) {
      return new Promise((resolve, reject) => {
        const items = [];
        const option = {
          nextContinuationToken: marker,
          delimiter: '/',
          maxKeys: opt.maxKeys || 1000,
          minKeys: opt.minKeys || 1000,
        };
        let prefix = key;
        if (!prefix.endsWith('/')) {
          prefix = prefix.substring(0, prefix.lastIndexOf('/') + 1);
        }
        getDefaultClient(opt).listObjects(region, bucket, key, option).then((listedObjects) => {
          if (listedObjects.commonPrefixes) {
            listedObjects.commonPrefixes.forEach((item) => {
              items.push({
                bucket: item.bucket,
                name: item.key.substring(prefix.length).replace(/\/$/, ''),
                path: item.key,
                itemType: 'folder',
              });
            });
          }
          if (listedObjects.objects) {
            const ONE_HOUR = 60 * 60 * 1000;
            listedObjects.objects.forEach((item) => {
              if (!key.endsWith('/') || item.key != key) {
                items.push({
                  bucket: bucket,
                  name: item.key.substring(prefix.length),
                  path: item.key,
                  size: item.size,
                  storageClass: item.storageClass,
                  lastModified: item.lastModified,
                  itemType: 'file',
                  withinFourHours: (new Date() - item.lastModified) <= 4 * ONE_HOUR,
                });
              }
            });
          }
          resolve({ data: items, marker: listedObjects.nextContinuationToken });
        }).catch((err) => {
          handleError(err);
          reject(err);
        });
      });
    }

    function listDomains(region, bucket, opt) {
      return new Promise((resolve, reject) => {
        getDefaultClient(opt).listDomains(region, bucket).then(resolve).catch((err) => {
          handleError(err);
          reject(err);
        });
      });
    }

    function createFolder(region, bucket, prefix, opt) {
      prefix = path.normalize(prefix);
      const basename = path.basename(prefix);
      if (path.sep == '\\') {
        prefix = prefix.replace(/\\/g, '/');
      }

      return new Promise((resolve, reject) => {
        getDefaultClient(opt)
          .putObject(region, { bucket: bucket, key: prefix }, Buffer.alloc(0), basename)
          .then(resolve)
          .catch((err) => {
            handleError(err);
            reject(err);
          });
      });
    }

    function checkFileExists(region, bucket, key, opt) {
      return new Promise((resolve, reject) => {
        getDefaultClient(opt).isExists(region, { bucket: bucket, key: key }).then(resolve).catch((err) => {
          handleError(err);
          reject(err);
        });
      });
    }

    function checkFolderExists(region, bucket, prefix, opt) {
      return new Promise((resolve, reject) => {
        getDefaultClient(opt).listObjects(region, bucket, prefix, { maxKeys: 1 }).then((results) => {
          if (results.objects && results.objects.length > 0 && results.objects[0].key.startsWith(prefix)) {
            resolve(true);
          } else {
            resolve(false);
          }
        }).catch((err) => {
          handleError(err);
          reject(err);
        });
      });
    }

    function getFrozenInfo(region, bucket, key, opt) {
      return new Promise((resolve, reject) => {
        getDefaultClient(opt).getFrozenInfo(region, { bucket: bucket, key: key }).then(resolve).catch((err) => {
          handleError(err);
          reject(err);
        });
      });
    }

    function headFile(region, bucket, key, opt) {
      let promise = getDefaultClient(opt)
        .getObjectInfo(region, { bucket: bucket, key: key });
      if (!opt.ignoreError) {
        promise = promise.catch((err) => {
          handleError(err);
          reject(err);
        });
      }
      delete opt.ignoreError;
      return promise;
    }

    function getContent(region, bucket, key, domain, opt) {
      return new Promise((resolve, reject) => {
        getDefaultClient(opt).getObject(region, { bucket: bucket, key: key }, domain).then((result) => {
          resolve(result.data);
        }).catch((err) => {
          handleError(err);
          reject(err);
        });
      });
    }

    function saveContent(region, bucket, key, content, domain, getOpt, putOpt) {
      return new Promise((resolve, reject) => {
        getDefaultClient(getOpt).getObjectHeader(region, { bucket: bucket, key: key }, domain).then((headers) => {
          const basename = path.basename(key);
          getDefaultClient(putOpt).putObject(region, { bucket: bucket, key: key }, Buffer.from(content), basename,
            { metadata: headers.metadata },
          ).then(() => { resolve(); }).catch((err) => {
            handleError(err);
            reject(err);
          });
        }).catch((err) => {
          handleError(err);
          reject(err);
        });
      });
    }

    function moveOrCopyFile(region, bucket, oldKey, newKey, isCopy, opt) {
      const client = getDefaultClient(opt);
      const transferObject = {
        from: { bucket: bucket, key: oldKey },
        to: { bucket: bucket, key: newKey },
      };

      return new Promise((resolve, reject) => {
        if (isCopy) {
          return client.copyObject(region, transferObject).then(resolve).catch((err) => {
            handleError(err);
            reject(err);
          });
        } else {
          return client.moveObject(region, transferObject).then(resolve).catch((err) => {
            if (err.code === 'AccessDenied' && err.stage === 'delete') {
              Toast.error(T('permission.denied.move.error_when_delete', {
                fromKey: oldKey, toKey: newKey,
              }));
              reject(err);
              return;
            }
            handleError(err);
            reject(err);
          });
        }
      });
    }

    var stopCopyFilesFlag = false;

    function moveOrCopyFiles(region, items, target, progressFn, isCopy, renamePrefix, opt) {
      const progress = { total: 0, current: 0, errorCount: 0 };
      stopCopyFilesFlag = false;

      return new Promise((resolve, reject) => {
        const client = getDefaultClient(opt);
        const newProgressFn = (progress) => {
          if (progressFn) {
            try {
              progressFn(progress);
            } catch (err) {
              handleError(err);
            }
          }
        };
        newProgressFn(progress);

        deepForEachItem(client, region, items, target, progress, newProgressFn, isCopy, renamePrefix, new Semaphore(3))
          .then(resolve)
          .catch((err) => {
            handleError(err);
            reject(err);
          });
      });

      function deepForEachItem(client, region, items, target, progress, progressFn, isCopy, renamePrefix, semaphore) {
        const errorItems = [];

        if (stopCopyFilesFlag) {
          reject(new Error('User Cancelled'));
          return;
        }

        const transferObjects = items.map((item) => {
          let toPrefix = renamePrefix;

          if (!renamePrefix) {
            toPrefix = target.key.replace(/\/$/, '');
            if (toPrefix && toPrefix.length) {
              toPrefix += '/';
            }
            toPrefix += item.name;
          }

          return {
            from: { bucket: item.bucket, key: item.path },
            to: { bucket: target.bucket, key: toPrefix },
            item: item,
          };
        });
        const moveOrCopyFileCallback = (index, err) => {
          if (err) {
            errorItems.push({ item: transferObjects[index].item, error: err });
            progress.errorCount += 1;
            if (err.code === 'AccessDenied' && err.stage === 'delete') {
              err.translated_message = T('permission.denied.move.error_when_delete', {
                fromKey: transferObjects[index].from.key, toKey: transferObjects[index].to.key,
              });
            }
          } else {
            progress.current += 1;
          }
          progressFn(progress);
          if (stopCopyFilesFlag) {
            return false;
          }
        };

        const transferFileObjects = transferObjects.filter((transferObject) => transferObject.item.itemType === 'file');
        let promises = [];
        if (transferFileObjects && transferFileObjects.length > 0) {
          if (isCopy) {
            promises.push(client.copyObjects(region, transferFileObjects, moveOrCopyFileCallback));
          } else {
            promises.push(client.moveObjects(region, transferFileObjects, moveOrCopyFileCallback));
          }
          progress.total += transferFileObjects.length;
          progressFn(progress);
        }

        const transferFolderObjects = transferObjects.filter((transferObject) => transferObject.item.itemType === 'folder');
        promises = promises.concat(transferFolderObjects.map((transferObject) => {
          return doCopyFolder(client, region, transferObject, progress, progressFn, isCopy, semaphore, moveOrCopyFileCallback);
        }));
        return new Promise((resolve, reject) => {
          Promise.all(promises).then(() => { resolve(errorItems); }).catch(reject);
        });
      }

      function doCopyFolder(client, region, transferObject, progress, progressFn, isCopy, semaphore, moveOrCopyFileCallback) {
        return new Promise((resolve, reject) => {
          semaphore.acquire().then((release) => {
            _doCopyFolder(client, region, transferObject, progress, progressFn, isCopy, undefined, moveOrCopyFileCallback)
              .then(resolve, reject)
              .finally(() => { release(); });
          });
        });

        function _doCopyFolder(client, region, transferObject, progress, progressFn, isCopy, marker, moveOrCopyFileCallback) {
          return new Promise((resolve, reject) => {
            if (stopCopyFilesFlag) {
              reject(new Error('User Cancelled'));
              return;
            }
            client.listObjects(region, transferObject.from.bucket, transferObject.from.key, { nextContinuationToken: marker }).then((listedObjects) => {
              if (stopCopyFilesFlag) {
                reject(new Error('User Cancelled'));
                return;
              } else if (!listedObjects.objects || listedObjects.objects.length === 0) {
                resolve();
                return;
              }

              const transferObjects = listedObjects.objects.map((object) => {
                let toKey = transferObject.to.key.replace(/\/$/, '');
                if (toKey && toKey.length) {
                  toKey += '/';
                }
                toKey += object.key.substring(transferObject.from.key.length);
                return { from: object, to: { bucket: transferObject.to.bucket, key: toKey } };
              });

              progress.total += transferObjects.length;
              progressFn(progress);

              let promise;
              if (isCopy) {
                promise = client.copyObjects(region, transferObjects, moveOrCopyFileCallback);
              } else {
                promise = client.moveObjects(region, transferObjects, moveOrCopyFileCallback);
              }
              promise.then(() => {
                if (listedObjects.nextContinuationToken) {
                  _doCopyFolder(client, region, transferObject, progress, progressFn, isCopy, listedObjects.nextContinuationToken, moveOrCopyFileCallback)
                    .then(resolve, reject);
                } else {
                  resolve();
                }
              }).catch(reject);
            }).catch(reject);
          });
        }
      }
    }

    function stopMoveOrCopyFiles() {
      stopCopyFilesFlag = true;
    }

    function restoreFile(region, bucket, key, days, opt) {
      return new Promise((resolve, reject) => {
        getDefaultClient(opt).unfreeze(region, { bucket: bucket, key: key }, days).then(resolve).catch((err) => {
          handleError(err);
          reject(err);
        });
      });
    }

    var stopDeleteFilesFlag = false;

    function deleteFiles(region, bucket, items, progressFn, opt) {
      const progress = { total: 0, current: 0, errorCount: 0 };
      stopDeleteFilesFlag = false;

      const errorItems = [];
      const client = getDefaultClient(opt);
      const newProgressFn = (progress) => {
        if (progressFn) {
          try {
            progressFn(progress);
          } catch (err) {
            handleError(err);
          }
        }
      };
      newProgressFn(progress);

      const deleteCallback = (index, error) => {
        if (error) {
          errorItems.push({ item: items[index], error: error });
          progress.errorCount += 1;
        } else {
          progress.current += 1;
        }
        newProgressFn(progress);
        if (stopDeleteFilesFlag) {
          return false;
        }
      };

      const toDeleteObjects = items.filter((item) => item.itemType === 'file');
      let promises = [];
      if (toDeleteObjects && toDeleteObjects.length > 0) {
        promises.push(client.deleteObjects(region, bucket, toDeleteObjects.map((item) => item.path), deleteCallback));
        progress.total += toDeleteObjects.length;
        newProgressFn(progress);
      }

      const toDeleteFolders = items.filter((item) => item.itemType === 'folder');
      const semaphore = new Semaphore(3);
      promises = promises.concat(toDeleteFolders.map((toDeleteFolder) => {
        return doDeleteFolder(client, region, toDeleteFolder, progress, newProgressFn, semaphore, deleteCallback);
      }));
      return new Promise((resolve, reject) => {
        Promise.all(promises).then(() => { resolve(errorItems); }, reject);
      })

      function doDeleteFolder(client, region, folderObject, progress, progressFn, semaphore, deleteCallback) {
        return new Promise((resolve, reject) => {
          semaphore.acquire().then((release) => {
            _doDeleteFolder(client, region, folderObject, progress, progressFn, undefined, deleteCallback)
              .then(resolve, reject)
              .finally(() => { release(); });
          });
        });

        function _doDeleteFolder(client, region, folderObject, progress, progressFn, marker, deleteCallback) {
          return new Promise((resolve, reject) => {
            if (stopDeleteFilesFlag) {
              reject(new Error('User Cancelled'));
              return;
            }
            client.listObjects(region, folderObject.bucket, folderObject.path, { nextContinuationToken: marker }).then((listedObjects) => {
              if (stopDeleteFilesFlag) {
                reject(new Error('User Cancelled'));
                return;
              } else if (!listedObjects.objects || listedObjects.objects.length === 0) {
                resolve();
                return;
              }

              progress.total += listedObjects.objects.length;
              progressFn(progress);

              client.deleteObjects(region, folderObject.bucket, listedObjects.objects.map((object) => object.key), deleteCallback).then(() => {
                if (listedObjects.nextContinuationToken) {
                  _doDeleteFolder(client, region, folderObject, progress, progressFn, listedObjects.nextContinuationToken, deleteCallback)
                    .then(resolve, reject);
                } else {
                  resolve();
                }
              }).catch(reject);
            }).catch(reject);
          });
        }
      }
    }

    function stopDeleteFiles() {
      stopDeleteFilesFlag = true;
    }

    function parseKodoPath(s3Path) {
      const KODO_ADDR_PROTOCOL = 'kodo://';

      if (!s3Path || s3Path.indexOf(KODO_ADDR_PROTOCOL) == -1 || s3Path == KODO_ADDR_PROTOCOL) {
        return {};
      }

      const str = s3Path.substring(KODO_ADDR_PROTOCOL.length);
      const index = str.indexOf('/');
      let bucketName, key = '';
      if (index == -1) {
        bucketName = str;
      } else {
        bucketName = str.substring(0, index);
        key = str.substring(index + 1);
      }

      return { bucketName: bucketName, key: key };
    }

    function signatureUrl(region, bucket, key, domain, expires, opt) {
      const deadline = new Date();
      deadline.setSeconds(deadline.getSeconds() + expires || 60);

      return new Promise((resolve, reject) => {
        getDefaultClient(opt)
          .getObjectURL(region, { bucket: bucket, key: key }, domain, deadline)
          .then(resolve)
          .catch((err) => {
            handleError(err);
            reject(err);
          });
      });
    }

    function getRegions(opt) {
      return new Promise((resolve, reject) => {
        getRegionService(opt).getAllRegions().then((regions) => {
          if (regions && regions.length > 0) {
            const lang = $rootScope.langSettings.lang.replace('-', '_');
            regions.forEach((region) => {
              if (region.translatedLabels && region.translatedLabels[lang]) {
                region.translatedLabel = region.translatedLabels[lang];
              } else {
                region.translatedLabel = region.label;
              }
            });
          }
          resolve(regions);
        }).catch((err) => {
          handleError(err);
          reject(err);
        });
      });
    }

    function clientBackendMode(opt) {
      const adapterOption = getAdapterOption(opt);
      const usePublicCloud = AuthInfo.usePublicCloud();
      if (adapterOption.regions && adapterOption.regions.length > 0 && !adapterOption.preferKodoAdapter || adapterOption.preferS3Adapter || !usePublicCloud) {
        return S3_MODE;
      } else {
        return KODO_MODE;
      }
    }

    function getRegionService(opt) {
      const adapterOption = getAdapterOption(opt);
      const cacheKey = makeAdapterCacheKey(adapterOption.accessKey, adapterOption.secretKey, adapterOption.ucUrl);

      if (regionServicesCache[cacheKey]) {
        return regionServicesCache[cacheKey];
      } else {
        const regionService = new RegionService(adapterOption);
        regionServicesCache[cacheKey] = regionService;
        return regionService;
      }
    }

    function getDefaultClient(opt) {
      switch (clientBackendMode(opt)) {
        case S3_MODE:
          return getS3Client(opt);
        case KODO_MODE:
          return getKodoClient(opt);
      }
    }

    function getKodoClient(opt) {
      const adapterOption = getAdapterOption(opt);
      const cacheKey = makeAdapterCacheKey(adapterOption.accessKey, adapterOption.secretKey, adapterOption.ucUrl);

      if (kodoAdaptersCache[cacheKey]) {
        return kodoAdaptersCache[cacheKey];
      } else {
        const qiniuAdapter = getQiniuAdapter(adapterOption.accessKey, adapterOption.secretKey, adapterOption.ucUrl, adapterOption.regions);
        const kodoClient = qiniuAdapter.mode(KODO_MODE, { requestCallback: debugRequest(KODO_MODE), responseCallback: debugResponse(KODO_MODE) });
        kodoAdaptersCache[cacheKey] = kodoClient;
        return kodoClient;
      }
    }

    function getS3Client(opt) {
      const adapterOption = getAdapterOption(opt);
      const cacheKey = makeAdapterCacheKey(adapterOption.accessKey, adapterOption.secretKey, adapterOption.ucUrl);

      if (s3AdaptersCache[cacheKey]) {
        return s3AdaptersCache[cacheKey];
      } else {
        const qiniuAdapter = getQiniuAdapter(adapterOption.accessKey, adapterOption.secretKey, adapterOption.ucUrl, adapterOption.regions);
        const s3Client = qiniuAdapter.mode(S3_MODE, { requestCallback: debugRequest(S3_MODE), responseCallback: debugResponse(S3_MODE) });
        s3AdaptersCache[cacheKey] = s3Client;
        return s3Client;
      }
    }

    function clearAllCache() {
      Object.keys(s3AdaptersCache).forEach((key) => {
        s3AdaptersCache[key].clearCache();
        delete s3AdaptersCache[key];
      });
      Object.keys(kodoAdaptersCache).forEach((key) => {
        kodoAdaptersCache[key].clearCache();
        delete kodoAdaptersCache[key];
      });
      Object.keys(regionServicesCache).forEach((key) => {
        regionServicesCache[key].clearCache();
        delete regionServicesCache[key];
      });
    }

    function debugRequest(mode) {
      return (request) => {
        if (settingsSvs.isDebug.get() === 0) {
          return;
        }
        let url = undefined, method = undefined, headers = undefined;
        if (request) {
          url = request.url;
          method = request.method;
          headers = request.headers;
        }
        console.info('>>', mode, 'REQ_URL:', url, 'REQ_METHOD:', method, 'REQ_HEADERS:', headers);
      };
    }

    function debugResponse(mode) {
      return (response) => {
        if (settingsSvs.isDebug.get() === 0) {
          return;
        }

        let requestUrl = undefined, requestMethod = undefined, requestHeaders = undefined,
          responseStatusCode = undefined, responseHeaders = undefined, responseInterval = undefined, responseData = undefined, responseError = undefined;
        if (response) {
          responseStatusCode = response.statusCode;
          responseHeaders = response.headers;
          responseInterval = response.interval;
          responseData = response.data;
          responseError = response.error;
          if (response.request) {
            requestUrl = response.request.url;
            requestMethod = response.request.method;
            requestHeaders = response.request.headers;
          }
        }
        console.info('<<', mode, 'REQ_URL:', requestUrl, 'REQ_METHOD:', requestMethod, 'REQ_HEADERS: ', requestHeaders,
          'RESP_STATUS:', responseStatusCode, 'RESP_HEADERS:', responseHeaders, 'RESP_INTERVAL:', responseInterval, 'ms RESP_DATA:', responseData, 'RESP_ERROR:', responseError);
      };
    }

    function getQiniuAdapter(accessKey, secretKey, ucUrl, regions) {
      if (!accessKey || !secretKey) {
        throw new Error('`accessKey` or `secretKey` is unavailable');
      }
      return new Qiniu(accessKey, secretKey, ucUrl, `Kodo-Browser/${Global.app.version}`, regions);
    }

    function getAdapterOption(opt) {
      const result = {};

      if (typeof opt === 'object' && opt.id && opt.secret) {
        result.accessKey = opt.id;
        result.secretKey = opt.secret;
        config = Config.load(opt.isPublicCloud);
      } else {
        result.accessKey = AuthInfo.get().id;
        result.secretKey = AuthInfo.get().secret;
        config = Config.load();
      }

      if (config.ucUrl) {
        result.ucUrl = config.ucUrl;
      }
      result.regions = config.regions || [];
      if (opt && opt.preferS3Adapter) {
        result.preferS3Adapter = opt.preferS3Adapter;
      }
      return result;
    }

    function makeAdapterCacheKey(accessKey, secretKey, ucUrl) {
      return `${accessKey}:${secretKey}:${ucUrl}`;
    }

    function handleError(err) {
      if (err.code === 'InvalidAccessKeyId') {
        $state.go('login');
      } else {
        if (!err.code) {
          if (err.message.indexOf('Failed to fetch') != -1) {
            err = {
              code: 'Error',
              message: 'Connection Error'
            };
          } else
            err = {
              code: 'Error',
              message: err.message
            };
        }

        console.error(err);
        if (err.code === 'Forbidden' || err.code === 'AccessDenied') {
          Toast.error(T('permission.denied'));
        } else {
          Toast.error(err.code + ': ' + err.message);
        }
      }
    }
  }
]);
