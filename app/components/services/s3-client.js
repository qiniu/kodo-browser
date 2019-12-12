angular.module("web").factory("s3Client", [
  "$q",
  "$rootScope",
  "$translate",
  "$timeout",
  "$state",
  "Toast",
  "Config",
  "KodoClient",
  "AuthInfo",
  function ($q, $rootScope, $translate, $timeout, $state, Toast, Config, KodoClient, AuthInfo) {
    const AWS = require("aws-sdk"),
          path = require("path"),
          each = require("array-each"),
          map = require("array-map"),
          async = require("async"),
          T = $translate.instant,

          NEXT_TICK = 1,
          KODO_ADDR_PROTOCOL = "kodo://";

    return {
      listAllBuckets: listAllBuckets,
      createBucket: createBucket,
      deleteBucket: deleteBucket,

      getBucketLocation: getBucketLocation,
      getBucketACL: getBucketACL,
      updateBucketACL: updateBucketACL,

      listAllFiles: listAllFiles,
      listFiles: listFiles,

      createFolder: createFolder,
      loadStorageStatus: loadStorageStatus,

      getMeta: getMeta,
      getFileInfo: getMeta,
      setMeta: setMeta,

      checkFileExists: checkFileExists,
      checkFolderExists: checkFolderExists,

      getContent: getContent,
      saveContent: saveContent,
      getImageBase64Url: getImageBase64Url,

      //重命名
      moveFile: moveFile,

      //复制，移动
      copyFiles: copyFiles,
      stopCopyFiles: stopCopyFiles,

      //删除
      deleteFiles: deleteFiles,
      stopDeleteFiles: stopDeleteFiles,

      getClient: getClient,
      parseKodoPath: parseKodoPath,
      parseRestoreInfo: parseRestoreInfo,
      signatureUrl: signatureUrl,
      signaturePicUrl: signaturePicUrl
    };

    function signaturePicUrl(region, bucket, key, expires, formatter) {
      return new Promise(function (resolve, reject) {
        var client = getClient({
          region: region,
          bucket: bucket
        });

        var params = {
          Bucket: bucket,
          Key: key,
          Expires: expires
        };

        client.getSignedUrl(
          "getObject", params,
          function (err, url) {
            if (err) {
              reject(err);
            } else {
              resolve(url);
            }
          }
        );
      });
    }

    function checkFolderExists(region, bucket, prefix) {
      var df = $q.defer();

      var client = getClient({
        region: region,
        bucket: bucket
      });

      var params = {
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: 1
      };

      client.listObjects(params,
        function (err, data) {
          if (err) {
            handleError(err);

            df.reject(err);
          } else {
            if (
              data.Contents.length > 0 &&
              data.Contents[0].Key.indexOf(prefix) == 0
            ) {
              df.resolve(true);
            } else {
              df.resolve(false);
            }
          }
        }
      );

      return df.promise;
    }

    function checkFileExists(region, bucket, key) {
      return new Promise(function (resolve, reject) {
        var client = getClient({
          region: region,
          bucket: bucket
        });

        var params = {
          Bucket: bucket,
          Key: key
        };

        client.headObject(params, function (err, data) {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    }

    var stopDeleteFilesFlag = false;

    function stopDeleteFiles() {
      stopDeleteFilesFlag = true;
    }

    /**
     * 批量删除文件或目录
     * @param region {string}
     * @param bucket {string}
     * @param items   {array}  item={path,isFolder}
     * @param progCb  {function} 可选， 进度回调  (current,total)
     */
    function deleteFiles(region, bucket, items, progCb) {
      stopDeleteFilesFlag = false;

      const df = $q.defer();
      const client = getClient({
        region: region,
        bucket: bucket
      });

      const progress = {
        total: items.length,
        current: 0,
        errorCount: 0
      };
      if (progCb) {
        progCb(progress);
      }

      const deleteItems = (items, callback) => {
        if (stopDeleteFilesFlag) {
          df.resolve([{ item: {}, error: new Error("User cancelled") }]);
          return;
        }
        if (!items.length) {
          callback([]);
          return;
        }

        let completed = 0;
        let errs = [];
        const waitAndDeleteItems = () => {
          const BATCH_SIZE = 1000;
          let deleteBatchFilesFuncs = [];
          completed += 1;
          if (completed < items.length) {
            return;
          }
          while (items.length >= BATCH_SIZE) {
            deleteBatchFilesFuncs = deleteBatchFilesFuncs.concat(deleteBatchFiles.bind(items.splice(0, BATCH_SIZE)));
          }
          if (items.length > 0) {
            deleteBatchFilesFuncs = deleteBatchFilesFuncs.concat(deleteBatchFiles.bind(items.splice(0, items.length)));
          }
          async.parallel(deleteBatchFilesFuncs, (errs2) => {
            if (errs2) {
              errs = errs.concat(errs2);
            }
            callback(errs);
          });
        }

        each(items, (item) => {
          if (item.isFolder) {
            deleteFolder(item, (errs2) => {
              if (errs2) {
                errs = errs.concat(errs2);
              }
              waitAndDeleteItems();
            });
          } else {
            waitAndDeleteItems();
          }
        });
      };

      const deleteFolder = (folder, callback) => {
        const callbackWithStopFlagsChecks = (err) => {
          if (stopDeleteFilesFlag) {
            df.resolve([{ item: {}, error: new Error("User cancelled") }]);
            return;
          }
          callback(err);
        }
        listAllFiles(region, bucket, folder.path).then((subItems) => {
          progress.total += subItems.length;
          if (progCb) {
            progCb(progress);
          }
          deleteItems(subItems, callbackWithStopFlagsChecks);
        }, callbackWithStopFlagsChecks);
      };

      function deleteBatchFiles(callback) {
        client.deleteObjects({
          Bucket: bucket,
          Delete: {
            Objects: map(this, (item) => { return { Key: item.path }; })
          }
        }, (err, data) => {
          if (err) {
            progress.errorCount += this.length;
          } else {
            progress.current += data.Deleted.length;
            progress.errorCount += data.Errors.length;
          }
          if (progCb) {
            progCb(progress);
          }
          if (err) {
            callback(map(this, (item) => { return { item: item, error: err } }));
          } else if (data.Errors.length > 0) {
            const errors = [];
            each(data.Errors, (errItem) => {
              each(this, (item) => {
                if (errItem.Key === item.Key) {
                  errors.push({ item: item, error: new Error(errItem.Message) });
                }
              });
            });
            callback(errors);
          } else {
            callback();
          }
        });
      }

      deleteItems(items, function (errs) {
        if (errs && errs.length > 0) {
          df.resolve(errs);
        } else {
          df.resolve();
        }
      });
      return df.promise;
    }

    var stopCopyFilesFlag = false;

    function stopCopyFiles() {
      stopCopyFilesFlag = true;
    }
    /**
     * 批量复制或移动文件
     * @param retion {string} 要求相同region
     * @param items {array} 需要被复制的文件列表，可能为folder，可能为file
     * @param target {object} {bucket,key} 目标目录路径
     * @param progFn {Function} 进度回调  {current:1, total: 11, errorCount: 0}
     * @param removeAfterCopy {boolean} 移动flag，复制后删除。 默认false
     * @param renameKey {string} 重命名目录的 key。
     */
    function copyFiles(
      region,
      items,
      target,
      progFn,
      removeAfterCopy,
      renameKey
    ) {
      var progress = {
        total: 0,
        current: 0,
        errorCount: 0
      };
      stopCopyFilesFlag = false;

      //入口
      var df = $q.defer();
      digArr(items, target, renameKey, function (terr) {
        df.resolve(terr);
      });
      return df.promise;

      //copy file
      function copyFile(client, from, to, fn) {
        var toKey = to.key;
        var fromKey = "/" + from.bucket + "/" + encodeURIComponent(from.key);
        console.info(
          removeAfterCopy ? "move" : "copy",
          "::",
          from.bucket + "/" + from.key,
          "==>",
          to.bucket + "/" + toKey
        );

        var params = {
          Bucket: to.bucket,
          Key: toKey,
          CopySource: fromKey,
          MetadataDirective: "REPLACE"
        };

        client.copyObject(params,
          function (err) {
            if (err) {
              fn(err);
            } else if (removeAfterCopy) {
              client.deleteObject({Bucket: from.bucket, Key: from.key}, function (err) {
                if (err) {
                  fn(err);
                } else {
                  fn();
                }
              });
            } else {
              fn();
            }
          }
        );
      }

      //打平，一条一条 copy
      function doCopyFiles(bucket, pkey, arr, target, fn) {
        var len = arr.length;
        var c = 0;
        var t = [];

        progress.total += len;

        var client = getClient({
          region: region,
          bucket: target.bucket
        });

        function _dig() {
          if (c >= len) {
            $timeout(function () {
              fn(t);
            }, NEXT_TICK);
            return;
          }

          if (stopCopyFilesFlag) {
            df.resolve([{
              item: {},
              error: new Error("User cancelled")
            }]);
            return;
          }

          var item = arr[c];
          var toKey = target.key.replace(/\/$/, "");
          toKey = (toKey ? toKey + "/" : "") + item.path.substring(pkey.length);

          copyFile(
            client, {
              bucket: bucket,
              key: item.path
            }, {
              bucket: target.bucket,
              key: toKey
            },
            function (err) {
              if (err) {
                progress.errorCount++;

                if (progFn) {
                  try {
                    progFn(progress);
                  } catch (e) {}
                }

                t.push({
                  item: item,
                  error: err
                });
              }

              progress.current++;
              if (progFn) {
                try {
                  progFn(progress);
                } catch (e) {}
              }
              c++;

              //fix ubuntu
              $timeout(_dig, NEXT_TICK);
            }
          );
        }
        _dig();
      }

      function doCopyFolder(source, target, fn) {
        var t = [];
        var client = getClient({
          region: region,
          bucket: source.bucket
        });

        function next(marker) {
          var opt = {
            Bucket: source.bucket,
            Prefix: source.path
          };
          if (marker) {
            opt.Marker = marker;
          }

          client.listObjects(opt, function (err, result) {
            if (err) {
              t.push({
                item: source,
                error: err
              });

              $timeout(function () {
                fn(t);
              }, NEXT_TICK);
              return;
            }

            var newTarget = {
              bucket: target.bucket,
              key: target.key
            };

            var prefix = opt.Prefix;
            if (!prefix.endsWith("/")) {
              prefix = prefix.substring(0, prefix.lastIndexOf("/") + 1);
            }

            var objs = [];
            result["Contents"].forEach(function (n) {
              n.Prefix = n.Prefix || "";

              n.isFile = true;
              n.itemType = "file";
              n.path = n.Key;
              n.name = n.Key.substring(prefix.length);
              n.size = n.Size;
              n.storageClass = n.StorageClass;
              n.type = n.Type;
              n.lastModified = n.LastModified;
              n.url = getS3Url(region, opt.Bucket, n.Key);

              objs.push(n);
            });

            doCopyFiles(
              source.bucket,
              source.path,
              objs,
              newTarget,
              function (terr) {
                if (stopCopyFilesFlag) {
                  df.resolve([{
                    item: {},
                    error: new Error("User cancelled")
                  }]);
                  return;
                }

                if (terr) {
                  t = t.concat(terr);
                }

                if (result.NextMarker) {
                  $timeout(function () {
                    next(result.NextMarker);
                  }, NEXT_TICK);
                } else {
                  $timeout(function () {
                    fn(t);
                  }, NEXT_TICK);
                }
              }
            );
          });
        }
        next();
      }

      function doCopyFile(source, target, fn) {
        var client = getClient({
          region: region,
          bucket: target.bucket
        });
        copyFile(
          client, {
            bucket: source.bucket,
            key: source.path
          }, {
            bucket: target.bucket,
            key: target.key
          },
          function (err) {
            if (err) {
              fn(err);
            } else {
              fn();
            }
          }
        );
      }

      function digArr(items, target, renameKey, fn) {
        var len = items.length;
        var c = 0;
        var terr = [];

        progress.total += len;
        if (progFn) {
          try {
            progFn(progress);
          } catch (e) {}
        }

        function _() {
          if (c >= len) {
            fn(terr);
            return;
          }

          if (stopCopyFilesFlag) {
            df.resolve([{
              item: {},
              error: new Error("User cancelled")
            }]);
            return;
          }

          var item = items[c];
          var toKey = renameKey;

          if (!renameKey) {
            toKey = target.key.replace(/\/$/, "");
            toKey = (toKey ? toKey + "/" : "") + item.name;
          }

          var newTarget = {
            bucket: target.bucket,
            key: toKey
          };
          c++;

          if (item.isFile) {
            doCopyFile(item, newTarget, function (err) {
              if (err) {
                progress.errorCount++;
                if (progFn) {
                  try {
                    progFn(progress);
                  } catch (e) {}
                }

                terr.push({
                  item: item,
                  error: err
                });

                $timeout(_, NEXT_TICK);
                return;
              }

              progress.current++;
              if (progFn) {
                try {
                  progFn(progress);
                } catch (e) {}
              }

              $timeout(_, NEXT_TICK);
            });
          } else {
            doCopyFolder(item, newTarget, function (errs) {
              if (errs) {
                terr = terr.concat(errs);
              }

              progress.current++;
              if (progFn) {
                try {
                  progFn(progress);
                } catch (e) {}
              }

              $timeout(_, NEXT_TICK);
            });
          }
        }
        _();
      }
    }

    //移动文件，重命名文件
    function moveFile(region, bucket, oldKey, newKey, isCopy) {
      var df = $q.defer();

      var client = getClient({
        region: region,
        bucket: bucket
      });

      var params = {
        Bucket: bucket,
        Key: newKey,
        CopySource: "/" + bucket + "/" + encodeURIComponent(oldKey),
        MetadataDirective: "REPLACE" // 'REPLACE' 表示覆盖 meta 信息，'COPY' 表示不覆盖，只拷贝
      };

      client.copyObject(params, function (err) {
        if (err) {
          handleError(err);
          df.reject(err);
        } else if (isCopy) {
          df.resolve();
        } else {
          client.deleteObject({ Bucket: bucket, Key: oldKey }, function (err) {
            if (err) {
              handleError(err);
              df.reject(err);
            } else {
              df.resolve();
            }
          });
        }
      });
      return df.promise;
    }

    /**************************************/

    function createFolder(region, bucket, prefix) {
      prefix = path.normalize(prefix);
      if (path.sep == "\\") {
        prefix = prefix.replace(/\\/g, "/");
      }

      return new Promise(function (resolve, reject) {
        var client = getClient({
          region: region,
          bucket: bucket
        });

        client.putObject({
          Bucket: bucket,
          Key: prefix,
          Body: ""
        }, function (err, data) {
          if (err) {
            handleError(err);

            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    }

    function deleteBucket(region, bucket) {
      return new Promise(function (resolve, reject) {
        var client = getClient({
          region: region,
          bucket: bucket
        });

        client.deleteBucket({
          Bucket: bucket
        }, function (err, data) {
          if (err) {
            handleError(err);

            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    }

    function signatureUrl(region, bucket, key, expires) {
      var client = getClient({
        region: region,
        bucket: bucket
      });

      var url = client.getSignedUrl("getObject", {
        Bucket: bucket,
        Key: key,
        Expires: expires || 60
      });

      return url;
    }

    function getBucketLocation(bucket) {
      var df = $q.defer();

      getClient().getBucketLocation({
        Bucket: bucket
      }, function (err, data) {
        if (err) {
          handleError(err);

          df.reject(err);
        } else {
          df.resolve(data.LocationConstraint.replace(/<[^>]+>/, ''));
        }
      });

      return df.promise;
    }

    function getBucketACL(region, bucket) {
      var df = $q.defer();

      var client = getClient({
        region: region,
        bucket: bucket
      });

      client.getBucketAcl({
        Bucket: bucket
      }, function (err, data) {
        if (err) {
          handleError(err);

          df.reject(err);
        } else {
          if (data.Grants && data.Grants.length == 1) {
            var t = [];
            for (var k in data.Grants[0]) {
              t.push(data.Grants[0][k]);
            }
            data.acl = t.join("");
          } else {
            data.acl = "default";
          }

          df.resolve(data);
        }
      });

      return df.promise;
    }

    function updateBucketACL(region, bucket, acl) {
      var df = $q.defer();

      var client = getClient({
        region: region,
        bucket: bucket
      });

      client.putBucketAcl({
        Bucket: bucket,
        ACL: acl
      }, function (err, data) {
        if (err) {
          handleError(err);

          df.reject(err);
        } else {
          df.resolve(data);
        }
      });

      return df.promise;
    }

    function getImageBase64Url(region, bucket, key) {
      return new Promise(function (resolve, reject) {
        var client = getClient({
          region: region,
          bucket: bucket
        });

        client.getObject({
          Bucket: bucket,
          Key: key
        }, function (err, data) {
          if (err) {
            handleError(err);

            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    }

    function getContent(region, bucket, key) {
      return new Promise(function (resolve, reject) {
        var client = getClient({
          region: region,
          bucket: bucket
        });

        client.getObject({
          Bucket: bucket,
          Key: key
        }, function (err, data) {
          if (err) {
            handleError(err);

            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    }

    function saveContent(region, bucket, key, content) {
      return new Promise(function (resolve, reject) {
        var client = getClient({
          region: region,
          bucket: bucket
        });

        client.headObject({
          Bucket: bucket,
          Key: key
        }, function (err, result) {
          if (err) {
            handleError(err);

            reject(err);
          } else {
            client.putObject({
              Bucket: bucket,
              Key: key,
              Body: content,

              //保留http头
              ContentLanguage: result.ContentLanguage,
              ContentType: result.ContentType,
              CacheControl: result.CacheControl,
              ContentDisposition: result.ContentDisposition,
              ContentEncoding: "",
              Expires: result.Expires,
              Metadata: result.Metadata
            }, function (err) {
              if (err) {
                handleError(err);

                reject(err);
              } else {
                resolve();
              }
            });
          }
        });
      });
    }

    function createBucket(region, bucket, acl, storageClass) {
      return new Promise(function (resolve, reject) {
        var client = getClient({
          region: region,
          bucket: bucket
        });

        client.createBucket({
          Bucket: bucket,
          CreateBucketConfiguration: {
            LocationConstraint: region
          }
        }, function (err, data) {
          if (err) {
            handleError(err);
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    }

    function getMeta(region, bucket, key) {
      return new Promise(function (resolve, reject) {
        var client = getClient({
          region: region,
          bucket: bucket
        });

        var opt = {
          Bucket: bucket,
          Key: key
        };

        client.headObject(opt, function (err, data) {
          if (err) {
            handleError(err);
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    }

    function setMeta(region, bucket, key, headers, metas) {
      return new Promise(function (resolve, reject) {
        var client = getClient({
          region: region,
          bucket: bucket
        });

        var opt = {
          Bucket: bucket,
          Key: key,
          CopySource: "/" + bucket + "/" + encodeURIComponent(key),
          MetadataDirective: "REPLACE", //覆盖meta

          Metadata: metas || {},

          ContentType: headers["ContentType"],
          CacheControl: headers["CacheControl"],
          ContentDisposition: headers["ContentDisposition"],
          ContentLanguage: headers["ContentLanguage"],
          Expires: headers["Expires"]
        };

        client.copyObject(opt, function (err, data) {
          if (err) {
            handleError(err);
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    }

    function listFiles(region, bucket, key, marker) {
      return new Promise(function (resolve, reject) {
        _listFilesOrigion(region, bucket, key, marker).then(function (result) {
          var arr = result.data;
          if (arr && arr.length) {
            $timeout(() => {
              loadStorageStatus(region, bucket, arr);
            }, NEXT_TICK);
          }
          resolve(result);
        }, function (err) {
          reject(err);
        });
      });
    }

    function loadStorageStatus(region, bucket, arr) {
      return new Promise(function (resolve, reject) {
        var len = arr.length;
        var c = 0;
        _dig();

        function _dig() {
          if (c >= len) {
            resolve();
            return;
          }

          var item = arr[c];
          c++;

          if (!item.isFile || item.storageClass != "Archive") {
            $timeout(_dig, NEXT_TICK);
            return;
          }

          getMeta(region, bucket, item.path).then(
            function (data) {
              item.storageStatus = 1;

              $timeout(_dig, NEXT_TICK);
            },
            function (err) {
              reject(err);
              $timeout(_dig, NEXT_TICK);
            }
          );
        }
      });
    }

    function _listFilesOrigion(region, bucket, key, marker) {
      return new Promise(function (resolve, reject) {
        var client = getClient({
          region: region,
          bucket: bucket
        });

        var t = [];
        var t_pre = [];
        var opt = {
          Bucket: bucket,
          Prefix: key,
          Delimiter: "/",
          Marker: marker || "",
          MaxKeys: 1000
        };

        client.listObjects(opt, function (err, result) {
          if (err) {
            handleError(err);
            reject(err);
            return;
          }

          var prefix = opt.Prefix;
          if (!prefix.endsWith("/")) {
            prefix = prefix.substring(0, prefix.lastIndexOf("/") + 1);
          }

          //目录
          if (result.CommonPrefixes) {
            result.CommonPrefixes.forEach(function (n) {
              n = n.Prefix;
              t_pre.push({
                name: n.substring(prefix.length).replace(/(\/$)/, ""),
                path: n,
                isFolder: true,
                itemType: "folder"
              });
            });
          }

          //文件
          if (result["Contents"]) {
            var ONE_HOUR = 60 * 60 * 1000; // ms

            result["Contents"].forEach(function (n) {
              n.Prefix = n.Prefix || "";

              if (!opt.Prefix.endsWith("/") || n.Key != opt.Prefix) {
                n.isFile = true;
                n.itemType = "file";
                n.path = n.Key;
                n.name = n.Key.substring(prefix.length);
                n.size = n.Size;
                n.storageClass = n.StorageClass;
                n.type = n.Type;
                n.lastModified = n.LastModified;
                n.url = getS3Url(region, opt.Bucket, n.Key);
                n.WithinFourHours = (((new Date()) - n.LastModified) <= 4 * ONE_HOUR);

                t.push(n);
              }
            });
          }

          resolve({
            data: t_pre.concat(t),
            marker: result.NextMarker
          });
        });
      });
    }

    //同一时间只能有一个查询，上一个查询如果没有完成，则会被abort
    var keepListFilesJob;

    function listAllFiles(region, bucket, key, folderOnly) {
      return new Promise(function (resolve, reject) {
        keepListFilesJob = new DeepListJob(
          region,
          bucket,
          key,
          folderOnly,
          function (data) {
            resolve(data);
          },
          function (err) {
            handleError(err);
            reject(err);
          }
        );
      });
    }

    function DeepListJob(region, bucket, key, folderOnly, succFn, errFn) {
      var stopFlag = false;

      var client = getClient({
        region: region,
        bucket: bucket
      });

      var t = [];
      var t_pre = [];
      var opt = {
        Bucket: bucket,
        Prefix: key,
        Delimiter: "/"
      };

      function _dig() {
        if (stopFlag) {
          return;
        }

        client.listObjects(opt, function (err, result) {
          if (stopFlag) {
            return;
          }

          if (err) {
            errFn(err);
            return;
          }

          var prefix = opt.Prefix;
          if (!prefix.endsWith("/")) {
            prefix = prefix.substring(0, prefix.lastIndexOf("/") + 1);
          }

          //目录
          if (result.CommonPrefixes) {
            result.CommonPrefixes.forEach(function (n) {
              n = n.Prefix;
              t_pre.push({
                name: n.substring(prefix.length).replace(/(\/$)/, ""),
                path: n,
                isFolder: true,
                itemType: "folder"
              });
            });
          }

          //文件
          if (!folderOnly && result["Contents"]) {
            result["Contents"].forEach(function (n) {
              n.Prefix = n.Prefix || "";

              if (!opt.Prefix.endsWith("/") || n.Key != opt.Prefix) {
                n.isFile = true;
                n.itemType = "file";
                n.path = n.Key;
                n.name = n.Key.substring(prefix.length);
                n.size = n.Size;
                n.storageClass = n.StorageClass;
                n.type = n.Type;
                n.lastModified = n.LastModified;
                n.url = getS3Url(region, opt.Bucket, n.Key);

                t.push(n);
              }
            });
          }

          if (result.NextMarker) {
            opt.Marker = result.NextMarker;

            $timeout(_dig, NEXT_TICK);
          } else {
            if (stopFlag) {
              return;
            }

            succFn(t_pre.concat(t));
          }
        });
      }
      _dig();

      //////////////////////////
      this.abort = function () {
        stopFlag = true;
      };
    }

    function listAllBuckets() {
      return new Promise(function (resolve, reject) {
        var client = getClient();

        var t = [];
        var opt = {};

        function _dig() {
          KodoClient.getBucketIdNameMapper().then((idNameMapper) => {
            client.listBuckets(opt, function (err, result) {
              if (err) {
                handleError(err);
                reject(err);
                return;
              }

              if (result["Buckets"]) {
                result["Buckets"].forEach(function (n) {
                  n.creationDate = n.CreationDate;
                  n.region = n.Location;
                  n.bucketId = n.Name;
                  n.name = idNameMapper[n.bucketId] || n.bucketId;
                  n.Name = n.name;
                  n.extranetEndpoint = n.ExtranetEndpoint;
                  n.intranetEndpoint = n.IntranetEndpoint;
                  n.storageClass = n.StorageClass;
                  n.lastModified = n.LastModified;

                  n.isBucket = true;
                  n.itemType = "bucket";
                });
                t = t.concat(result["Buckets"]);
              }

              if (result.NextMarker) {
                opt.Marker = result.NextMarker;

                $timeout(_dig, NEXT_TICK);
              } else {
                resolve(t);
              }
            });
          }, (err) => {
            if (err) {
              handleError(err);
              reject(err);
            }
          });
        }
        _dig();
      });
    }

    function parseRestoreInfo(s) {
      //"ongoing-request="true"
      var arr = s.match(/([\w\-]+)=\"([^\"]+)\"/g);
      var m = {};
      angular.forEach(arr, function (n) {
        var kv = n.match(/([\w\-]+)=\"([^\"]+)\"/);
        m[kv[1]] = kv[2];
      });
      return m;
    }

    function handleError(err) {
      if (err.code === "InvalidAccessKeyId") {
        $state.go("login");
      } else {
        if (!err.code) {
          if (err.message.indexOf("Failed to fetch") != -1) {
            err = {
              code: "Error",
              message: "Connection Error"
            };
          } else
            err = {
              code: "Error",
              message: err.message
            };
        }

        if (
          err.code === "NetworkingError" &&
          err.message.indexOf("ENOTFOUND") != -1
        ) {
          console.error(err);
        } else if (err.code === 'Forbidden') {
          Toast.error(T('permission.denied'));
        } else {
          Toast.error(err.code + ": " + err.message);
        }
      }
    }

    /**
     * @param opt   {object|string}
     *    object = {id, secret, region, bucket}
     */
    function getClient(opt) {
      var options = prepareOptions(opt);

      var client = new AWS.S3({
        apiVersion: "2006-03-01",
        customUserAgent: `QiniuKodoBrowser/${Global.app.version}`,
        computeChecksums: true,
        logger: console,
        endpoint: options.endpoint,
        region: options.region,
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
        maxRetries: options.maxRetries,
        s3ForcePathStyle: true,
        signatureVersion: "v4",
        httpOptions: {
          connectTimeout: 3000, // 3s
          timeout: 300000 // 5m
        }
      });

      return client;
    }

    function prepareOptions(opt) {
      var authInfo = AuthInfo.get();

      var bucket;
      if (typeof opt == "object") {
        if (opt.region) {
          angular.forEach(Config.load(AuthInfo.usePublicCloud()).regions, (region) => {
            if (region.id == opt.region) {
              opt.servicetpl = region.endpoint;
            }
          });
        }
        bucket = opt.bucket;
        Object.assign(authInfo, opt);
      }

      return options = {
        accessKeyId: authInfo.id || "ak",
        secretAccessKey: authInfo.secret || "sk",
        endpoint: authInfo.servicetpl,
        region: authInfo.region,
        apiVersion: "2013-10-15",
        httpOptions: {
          timeout: authInfo.httpOptions ? authInfo.httpOptions.timeout : 0
        },
        maxRetries: 10
      };
    }

    function parseKodoPath(s3Path) {
      if (!s3Path || s3Path.indexOf(KODO_ADDR_PROTOCOL) == -1 || s3Path == KODO_ADDR_PROTOCOL) {
        return {};
      }

      var str = s3Path.substring(KODO_ADDR_PROTOCOL.length);
      var ind = str.indexOf("/");
      if (ind == -1) {
        var bucket = str;
        var key = "";
      } else {
        var bucket = str.substring(0, ind);
        var key = str.substring(ind + 1);
      }

      return {
        bucket: bucket,
        key: key
      };
    }

    function getS3Url(region, bucket, key) {
      key = encodeURIComponent(key);

      var authInfo = AuthInfo.get();
      if (authInfo.servicetpl) {
        var endpoint = authInfo.servicetpl;
        if (endpoint[endpoint.length - 1] !== "/") {
          endpoint += "/";
        }

        return endpoint + bucket + "/" + key;
      }

      var isHttps = Global.s3EndpointProtocol == "https:";

      if (bucket && $rootScope.bucketMap && $rootScope.bucketMap[bucket]) {
        var endpoint = $rootScope.bucketMap[bucket].extranetEndpoint;
        if (endpoint) {
          return isHttps ?
            "https://" + endpoint + "/" + bucket + "/" + key :
            "http://" + endpoint + "/" + bucket + "/" + key;
        }
      }

      //region是domain
      if (region && region.indexOf(".") != -1) {
        if (region.indexOf("http") != 0) {
          region =
            isHttps ?
            "https://" + region + "/" + bucket + "/" + key :
            "http://" + region + "/" + bucket + "/" + key;
        }
        return region;
      }

      //region
      if (isHttps) {
        return "https://" + region + ".qiniu.com" + "/" + bucket + "/" + key;
      }

      return "http://" + region + ".qiniu.com" + "/" + bucket + "/" + key;
    }
  }
]);
