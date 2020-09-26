angular.module("web").controller("filesCtrl", [
  "$rootScope",
  "$scope",
  "$filter",
  "$uibModal",
  "$timeout",
  "$translate",
  "$location",
  "Auth",
  "AuthInfo",
  "AuditLog",
  "s3Client",
  "KodoClient",
  "bucketMap",
  "settingsSvs",
  "ExternalPath",
  "fileSvs",
  "Toast",
  "Dialog",
  "Customize",
  "Domains",
  function (
    $rootScope,
    $scope,
    $filter,
    $modal,
    $timeout,
    $translate,
    $location,
    Auth,
    AuthInfo,
    AuditLog,
    s3Client,
    KodoClient,
    bucketMap,
    settingsSvs,
    ExternalPath,
    fileSvs,
    Toast,
    Dialog,
    Customize,
    Domains
  ) {
    const filter = require("array-filter"),
          deepEqual = require('fast-deep-equal'),
          { Base64 } = require('js-base64'),
          T = $translate.instant;

    angular.extend($scope, {
      showTab: 1,

      // supported mode: localBuckets, localFiles, externalPaths, externalFiles
      ref: {
        mode: 'localFiles',
        isListView: true
      },

      currentListView: true,
      currentBucketPerm: {},
      keepMoveOptions: null,

      transVisible: localStorage.getItem("transVisible") == "true",
      toggleTransVisible: function (visible) {
        localStorage.setItem("transVisible", visible);

        $timeout(() => {
          $scope.transVisible = visible;
        });
      },

      // Read OEM Customization config to disable features
      disabledFeatures: Customize.disable,

      // search
      sch: {
        bucketName: "",
        objectName: "",
        externalPathName: ""
      },
      selectedDomain: {
        bucketName: null,
        domain: null,
      },
      domains: [],
      showDomains: showDomains,
      refreshDomains: refreshDomains,
      searchObjectName: searchObjectName,
      searchBucketName: searchBucketName,
      searchExternalPathName: searchExternalPathName,

      // bucket selection
      bucket_sel: null,
      selectBucket: selectBucket,

      // file selection
      sel: {
        all: false, //boolean
        has: [], //[] item: s3Object={name,path,...}
        x: {} //{} {'i_'+$index, true|false}
      },
      selectFile: selectFile,
      toLoadMore: toLoadMore,

      stepByStepLoadingFiles: stepByStepLoadingFiles,

      // bucket ops
      showAddBucket: showAddBucket,
      showDeleteBucket: showDeleteBucket,

      // external links selection
      external_path_sel: null,
      selectExternalPath: selectExternalPath,

      // bucket ops
      showAddExternalPath: showAddExternalPath,
      showDeleteExternalPath: showDeleteExternalPath,

      // object ops
      showAddFolder: showAddFolder,
      showRename: showRename,
      showMove: showMove,
      showDeleteFiles: showDeleteFiles,
      showDeleteFilesSelected: showDeleteFilesSelected,

      // upload && download
      handlers: {
        uploadFilesHandler: null,
        downloadFilesHandler: null
      },
      handlerDrop: handlerDrop,
      showUploadDialog: showUploadDialog,
      showDownloadDialog: showDownloadDialog,
      showDownload: showDownload,

      // utils
      gotoAddress: gotoAddress,
      gotoExternalMode: gotoExternalMode,
      gotoLocalMode: gotoLocalMode,
      gotoExternalPath: gotoExternalPath,
      showDownloadLink: showDownloadLink,
      showDownloadLinkOfFilesSelected: showDownloadLinkOfFilesSelected,
      showPreview: showPreview,
      showACL: showACL,

      showPaste: showPaste,
      cancelPaste: cancelPaste
    });

    $scope.$watch("ref.isListView", (v) => {
      if ($scope.ref.mode === 'localBuckets') {
        initBucketSelect();
      } else if ($scope.ref.mode === 'externalPaths') {
        initExternalPathSelect();
      } else {
        initFilesSelect();
      }

      $timeout(() => {
        if ($scope.currentListView) {
          $scope.currentListView = v;

          return;
        }

        if (!v) {
          $scope.currentListView = v;

          return;
        }

        if ($scope.ref.mode === 'localBuckets') {
          showBucketsTable($scope.buckets);
        } else if ($scope.ref.mode === 'externalPaths') {
          showExternalPathsTable($scope.externalPaths);
        } else {
          showFilesTable($scope.objects);
        }
      });
    });

    /////////////////////////////////
    function gotoAddress(bucket, prefix) {
      let kodoAddress = "kodo://";

      if (bucket.startsWith(kodoAddress)) {
        bucket = bucket.substring(kodoAddress.length);
      }

      if (bucket) {
        kodoAddress += `${bucket}/${prefix || ""}`;
      }

      $rootScope.$broadcast("gotoKodoAddress", kodoAddress);
    }

    function gotoExternalMode() {
      $rootScope.$broadcast("gotoExternalMode");
    }

    function gotoLocalMode() {
      $rootScope.$broadcast("gotoLocalMode");
    }

    function getCurrentPath() {
      return `kodo://${$scope.currentInfo.bucketName}/${$scope.currentInfo.key}`;
    }

    function gotoExternalPath(bucketId, prefix) {
      let externalPath = "kodo://";

      if (bucketId) {
        externalPath += `${bucketId}/${prefix || ""}`;
      }

      $rootScope.$broadcast("gotoExternalPath", externalPath);
    }

    function getCurrentExternalPath() {
      return `kodo://${$scope.currentInfo.bucketName}/${$scope.currentInfo.key}`;
    }

    /////////////////////////////////

    function stepByStepLoadingFiles() {
      return settingsSvs.stepByStepLoadingFiles.get() == 1;
    }

    /////////////////////////////////

    function showDomains() {
      return AuthInfo.usePublicCloud() && $scope.ref.mode.startsWith('local');
    }

    function refreshDomains() {
      const info = angular.copy($scope.currentInfo);
      Domains.list(info.region, info.bucket).
              then((domains) => {
                $scope.domains = domains;
                let found = false;
                if ($scope.selectedDomain.domain !== null) {
                  angular.forEach(domains, (domain) => {
                    if (domain.name() === $scope.selectedDomain.domain.name()) {
                      $scope.selectedDomain.domain = domain;
                      found = true;
                    }
                  })
                }
                if (!found) {
                  angular.forEach(domains, (domain) => {
                    if (domain.default()) {
                      $scope.selectedDomain.domain = domain;
                    }
                  });
                }
              }, (err) => {
                console.error(err);
                Toast.error(err);
              });
    }

    /////////////////////////////////
    var refreshTid;

    $scope.$on("refreshFilesList", (e) => {
      $timeout.cancel(refreshTid);

      const bucketName = $scope.currentInfo.bucketName,
            key = $scope.currentInfo.key;
      refreshTid = $timeout(() => {
        if (bucketName === $scope.currentInfo.bucketName &&
            key === $scope.currentInfo.key) {
          gotoAddress(bucketName, key);
        }
      }, 600);
    });

    var searchTid;

    function searchObjectName() {
      $timeout.cancel(searchTid);

      var info = angular.copy($scope.currentInfo);
      searchTid = $timeout(() => {
        if (info.bucketName === $scope.currentInfo.bucketName &&
            info.key === $scope.currentInfo.key) {
          info.key += $scope.sch.objectName;
          listFiles(info);
        }
      }, 600);
    }

    function searchBucketName() {
      $timeout.cancel(searchTid);
      searchTid = $timeout(listBuckets, 600);
    }

    function searchExternalPathName() {
      $timeout.cancel(searchTid);
      searchTid = $timeout(listExternalPaths, 600);
    }

    /////////////////////////////////
    $timeout(init, 100);

    function init() {
      var user = AuthInfo.get();
      if (!user.isAuthed) {
        Auth.logout().then(() => {
          $location.url("/login");
        });

        return;
      }

      $rootScope.currentUser = user;
      $scope.ref.mode = 'localBuckets';

      $timeout(() => {
        addEvents();
        $scope.$broadcast("filesViewReady");
      });
    }

    function addEvents() {
      const KODO_ADDR_PROTOCOL = 'kodo://',
            onKodoAddressChange = (addr) => {
        let fileName;

        const info = s3Client.parseKodoPath(addr);
        $scope.currentInfo = info;
        if (!info.bucket) {
          $scope.domains = [];
          $scope.selectedDomain.bucketName = null;
          $scope.selectedDomain.domain = null;
        }

        if (info.key) {
          const lastSlash = info.key.lastIndexOf("/");
          // if not endswith /
          if (lastSlash != info.key.length - 1) {
            fileName = info.key.substring(lastSlash + 1);
            info.key = info.key.substring(0, lastSlash + 1);
          }
        }

        if (info.bucket) {
          // list objects
          const bucketInfo = $rootScope.bucketMap[info.bucket];
          if (bucketInfo) {
            if (!bucketInfo.region) {
              Toast.error("Forbidden");
              clearFilesList();
              return;
            }
            $scope.currentInfo.region = bucketInfo.region;
            $scope.ref.mode = 'localFiles';
            info.bucketName = bucketInfo.name;
            info.bucket = bucketInfo.bucketId;
          } else {
            const region = ExternalPath.getRegionByBucketSync(info.bucket);
            if (region) {
              $scope.currentInfo.region = region;
              $scope.ref.mode = 'externalFiles';
              info.bucketName = info.bucket; // TODO: Use bucket name here
            } else {
              Toast.error("Forbidden");
              clearFilesList();
              return;
            }
          }

          if (info.bucketName !== $scope.selectedDomain.bucketName) {
            $scope.domains = [Domains.s3(info.region, info.bucketName)];
            $scope.selectedDomain.bucketName = info.bucketName;
            $scope.selectedDomain.domain = $scope.domains[0];
          }

          $scope.currentBucket = info.bucket;
          $scope.currentBucketName = info.bucketName;

          // try to resolve bucket perm
          const user = $rootScope.currentUser;
          if (user.perm) {
            if (user.isSuper) {
              $scope.currentBucketPerm = user.perm;
            } else {
              $scope.currentBucketPerm = user.perm[info.bucket];
            }
          }

          if (showDomains()) {
            refreshDomains();
          }
          // search
          if (fileName) {
            $scope.sch.objectName = fileName;

            searchObjectName();
          } else {
            $scope.sch.objectName = '';
            $timeout(listFiles, 100);
          }
        } else {
          // list buckets
          $scope.currentBucket = null;

          if ($scope.ref.mode.startsWith('local')) {
            $scope.ref.mode = 'localBuckets';
            $timeout(listBuckets, 100);
          } else if ($scope.ref.mode.startsWith('external')) {
            $scope.ref.mode = 'externalPaths';
            $timeout(listExternalPaths, 100);
          } else {
            throw new Error('Unrecognized mode');
          }
        }
      };

      $scope.$on("kodoAddressChange", (evt, addr) => {
        evt.stopPropagation();

        console.log(`on:kodoAddressChange: ${addr}`);
        if ($rootScope.bucketMap) {
          onKodoAddressChange(addr);
        } else {
          $scope.isLoading = true;
          bucketMap.load().then((map) => {
            $rootScope.bucketMap = map;
            $scope.isLoading = false;
            onKodoAddressChange(addr);
          }, (err) => {
            $scope.isLoading = false;
            throw err;
          });
        }
      });
    }

    function listBuckets(fn) {
      clearFilesList();

      $timeout(() => {
        $scope.isLoading = true;
      });

      bucketMap.load().then((bucketMap) => {
        $rootScope.bucketMap = bucketMap;

        const buckets = [];
        for (const bucketName in bucketMap) {
          if ($scope.sch.bucketName && bucketName.indexOf($scope.sch.bucketName) < 0) {
            continue;
          }
          buckets.push(bucketMap[bucketName]);
        }
        $scope.buckets = buckets;
        $scope.isLoading = false;
        showBucketsTable(buckets);
        if (fn) fn(null);
      }, (err) => {
        $scope.isLoading = false;
        if (fn) fn(err);
      });
    }

    function listFiles(info, marker, fn) {
      clearFilesList();
      $scope.isLoading = true;

      info = info || angular.copy($scope.currentInfo);

      tryListFiles(info, marker, (err, files) => {
        $scope.isLoading = false;

        if (info.bucketName !== $scope.currentInfo.bucketName ||
            info.key !== $scope.currentInfo.key + $scope.sch.objectName) {
          return;
        }

        if (err) {
          Toast.error(JSON.stringify(err));
          return;
        }

        showFilesTable(files);
      });
    }

    function tryListFiles(info, marker, fn) {
      if (!info || !info.bucket) {
        return;
      }

      s3Client.listFiles(info.region, info.bucket, info.key, marker || "").then((result) => {
        $timeout(() => {
          if (info.bucketName !== $scope.currentInfo.bucketName ||
              info.key !== $scope.currentInfo.key + $scope.sch.objectName) {
            return;
          }

          const nextObjectsMarker = result.marker || null;
          if (nextObjectsMarker && !nextObjectsMarker.startsWith(info.key)) {
            return;
          } else {
            $scope.nextObjectsMarker = nextObjectsMarker;
            $scope.nextObjectsMarkerInfo = info;
          }

          $scope.objects = $scope.objects.concat(result.data);

          if ($scope.nextObjectsMarker) {
            if (!$scope.stepByStepLoadingFiles()) {
              $timeout(function() {
                tryLoadMore(info, nextObjectsMarker);
              }, 100);
            }
          }
        });

        if (fn) fn(null, result.data);

      }, (err) => {
        console.error(`list files: kodo://${info.bucketName}/${info.key}?marker=${marker}`, err);

        clearFilesList();

        if (fn) fn(err);
      });
    }

    var lastObjectsMarkerForLoadMore = null; // 最近一次点击 Load More 时的 nextObjectsMarker
    function toLoadMore() {
      if (lastObjectsMarkerForLoadMore !== $scope.nextObjectsMarker) {
        $timeout(() => {
          tryLoadMore($scope.nextObjectsMarkerInfo, $scope.nextObjectsMarker, {
            starting: () => {
              $scope.isLoading = true;
            },
            completed: () => {
              $scope.isLoading = false;
              lastObjectsMarkerForLoadMore = null;
            }
          });
          lastObjectsMarkerForLoadMore = $scope.nextObjectsMarker;
        }, 100);
      }
    }

    function tryLoadMore(info, nextObjectsMarker, callback) {
      callback = callback || {};

      if (info.bucketName !== $scope.currentInfo.bucketName ||
          info.key !== $scope.currentInfo.key + $scope.sch.objectName ||
          $scope.nextObjectsMarker !== nextObjectsMarker) {
        return;
      }
      console.log(`loading next kodo://${info.bucketName}/${info.key}?marker=${nextObjectsMarker}`);

      if (callback.starting) callback.starting();

      tryListFiles(info, nextObjectsMarker, (err, files) => {
        if (err) {
          Toast.error(JSON.stringify(err));
          return;
        }

        showFilesTable(files, true);
        if (callback.completed) callback.completed();
      });
    }

    function listExternalPaths(fn) {
      clearFilesList();

      $timeout(() => {
        $scope.isLoading = true;
      });

      ExternalPath.list().then((externalPaths) => {
        if ($scope.sch.externalPathName) {
          externalPaths = filter(externalPaths, (ep) => { return ep.shortPath.indexOf($scope.sch.externalPathName) >= 0; });
        }

        $timeout(() => {
          $scope.externalPaths = externalPaths;
          $scope.isLoading = false;
          showExternalPathsTable(externalPaths);
          if (fn) fn(null);
        });
      }, (err) => {
        console.error("list external paths error", err);
        $timeout(() => {
          $scope.isLoading = false;
          if (fn) fn(err);
        });
      });
    }

    function isFrozenOrNot(region, bucket, key, callbacks) {
      s3Client.isFrozenOrNot(region, bucket, key).then((data) => {
        if (callbacks[data.status]) {
          callbacks[data.status]();
        }
      }, (err) => {
        Toast.error(JSON.stringify(err));
        if (callbacks['error']) {
          callbacks['error'](err);
        }
      });
    }

    /////////////////////////////////
    function showAddBucket() {
      $modal.open({
        templateUrl: "main/files/modals/add-bucket-modal.html",
        controller: "addBucketModalCtrl",
        resolve: {
          item: () => {
            return null;
          },
          callback: () => {
            return () => {
              Toast.success(T("bucket.add.success"));
              $timeout(listBuckets, 500);
            };
          },
          regions: () => {
            return KodoClient.getRegionLabels();
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showAddExternalPath() {
      $modal.open({
        templateUrl: "main/files/modals/add-external-path-modal.html",
        controller: "addExternalPathModalCtrl",
        resolve: {
          item: () => {
            return null;
          },
          callback: () => {
            return () => {
              Toast.success(T("externalPath.add.success"));
              $timeout(listExternalPaths, 500);
            };
          },
          regions: () => {
            return KodoClient.getRegionLabels();
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showDeleteBucket(item) {
      const title = T("bucket.delete.title"),
          message = T("bucket.delete.message", {
            name: item.name,
            region: item.region
          });

      Dialog.confirm(
        title,
        message,
        (btn) => {
          if (btn) {
            s3Client.deleteBucket(item.region, item.name).then(() => {
              AuditLog.log('deleteBucket', {
                regionId: item.region,
                name: item.name,
              });
              Toast.success(T("bucket.delete.success")); //删除Bucket成功
              $timeout(listBuckets, 1000);
            });
          }
        },
        1
      );
    }

    function showDeleteExternalPath(item) {
      const title = T("externalPath.delete.title"),
          message = T("externalPath.delete.message", {
            region: item.regionId,
            path: item.fullPath
          });

      Dialog.confirm(
        title,
        message,
        (btn) => {
          if (btn) {
            ExternalPath.remove(item.fullPath, item.regionId).then(() => {
              Toast.success(T("externalPath.delete.success")); //删除外部路径成功

              AuditLog.log('deleteExternalPath', {
                regionId: item.regionId,
                fullPath: item.fullPath
              });
              $timeout(listExternalPaths, 1000);
            });
          }
        },
        1
      );
    }

    function showAddFolder() {
      $modal.open({
        templateUrl: "main/files/modals/add-folder-modal.html",
        controller: "addFolderModalCtrl",
        resolve: {
          currentInfo: () => {
            return angular.copy($scope.currentInfo);
          },
          callback: () => {
            return () => {
              Toast.success(T("folder.create.success"));

              $timeout(listFiles, 300);
            };
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showPreview(item, type) {
      var fileType = fileSvs.getFileType(item);
      fileType.type = type || fileType.type;

      var templateUrl = "main/files/modals/preview/others-modal.html",
        controller = "othersModalCtrl",
        backdrop = true;

      if (fileType.type == "code") {
        templateUrl = "main/files/modals/preview/code-modal.html";
        controller = "codeModalCtrl";
        backdrop = "static";
      } else if (fileType.type == "picture") {
        templateUrl = "main/files/modals/preview/picture-modal.html";
        controller = "pictureModalCtrl";
      } else if (fileType.type == "video") {
        templateUrl = "main/files/modals/preview/media-modal.html";
        controller = "mediaModalCtrl";
      } else if (fileType.type == "audio") {
        templateUrl = "main/files/modals/preview/media-modal.html";
        controller = "mediaModalCtrl";
      }
      // else if(fileType.type=='doc'){
      //   templateUrl= 'main/files/modals/preview/doc-modal.html';
      //   controller= 'docModalCtrl';
      // }

      $modal.open({
        templateUrl: templateUrl,
        controller: controller,
        size: "lg",
        //backdrop: backdrop,
        resolve: {
          bucketInfo: () => {
            return angular.copy($scope.currentInfo);
          },
          objectInfo: () => {
            return item;
          },
          fileType: () => {
            return fileType;
          },
          reload: () => {
            return () => {
              $timeout(listFiles, 300);
            };
          },
          showFn: () => {
            return {
              callback: (reloadStorageStatus) => {
                if (reloadStorageStatus) {
                  $timeout(() => {
                    s3Client.loadStorageStatus(
                      $scope.currentInfo.region,
                      $scope.currentInfo.bucket, [item]
                    );
                  }, 300);
                }
              },
              preview: showPreview,
              download: () => {
                showDownload(item);
              },
              move: (isCopy) => {
                showMove([item], isCopy);
              },
              remove: () => {
                showDeleteFiles([item]);
              },
              rename: () => {
                showRename(item);
              },
              downloadLink: () => {
                showDownloadLink(item);
              },
              acl: () => {
                showACL(item);
              },
              crc: () => {
                showCRC(item);
              }
            };
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showRename(item) {
      $modal.open({
        templateUrl: "main/files/modals/rename-modal.html",
        controller: "renameModalCtrl",
        backdrop: "static",
        resolve: {
          item: () => {
            return angular.copy(item);
          },
          moveTo: () => {
            return angular.copy($scope.currentInfo);
          },
          currentInfo: () => {
            return angular.copy($scope.currentInfo);
          },
          isCopy: () => {
            return false;
          },
          callback: () => {
            return () => {
              $timeout(() => {
                listFiles();
              }, 300);
            };
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showPaste() {
      var keyword = $scope.keepMoveOptions.isCopy ? T("copy") : T("move");

      if ($scope.keepMoveOptions.items.length == 1 &&
          deepEqual($scope.currentInfo, $scope.keepMoveOptions.currentInfo)) {
        $modal.open({
          templateUrl: "main/files/modals/rename-modal.html",
          controller: "renameModalCtrl",
          backdrop: "static",
          resolve: {
            item: () => {
              return angular.copy($scope.keepMoveOptions.items[0]);
            },
            moveTo: () => {
              return angular.copy($scope.currentInfo);
            },
            currentInfo: () => {
              return angular.copy($scope.keepMoveOptions.currentInfo);
            },
            isCopy: () => {
              return $scope.keepMoveOptions.isCopy;
            },
            callback: () => {
              return () => {
                $scope.keepMoveOptions = null;

                $timeout(() => {
                  listFiles();
                }, 100);
              };
            }
          }
        }).result.then(angular.noop, angular.noop);

        return;
      }

      var msg = T("paste.message1", {
        name: $scope.keepMoveOptions.items[0].name,
        action: keyword
      });

      Dialog.confirm(keyword, msg, (isMove) => {
        if (isMove) {
          $modal.open({
            templateUrl: "main/files/modals/move-modal.html",
            controller: "moveModalCtrl",
            backdrop: "static",
            resolve: {
              items: () => {
                return angular.copy($scope.keepMoveOptions.items);
              },
              moveTo: () => {
                return angular.copy($scope.currentInfo);
              },
              isCopy: () => {
                return $scope.keepMoveOptions.isCopy;
              },
              renamePath: () => {
                return "";
              },
              fromInfo: () => {
                return angular.copy($scope.keepMoveOptions.currentInfo);
              },
              callback: () => {
                return () => {
                  $scope.keepMoveOptions = null;

                  $timeout(() => {
                    listFiles();
                  }, 100);
                };
              }
            }
          }).result.then(angular.noop, angular.noop);
        }
      });
    }

    function cancelPaste() {
      $timeout(() => {
        $scope.keepMoveOptions = null;
      });
    }

    function showMove(items, isCopy) {
      $scope.keepMoveOptions = {
        items: items,
        isCopy: isCopy,
        currentInfo: angular.copy($scope.currentInfo),
        originPath: getCurrentPath()
      };
    }

    function showDownloadLink(item) {
      $modal.open({
        templateUrl: "main/files/modals/show-download-link-modal.html",
        controller: "showDownloadLinkModalCtrl",
        resolve: {
          item: () => {
            return angular.copy(item);
          },
          current: () => {
            return {
              info: angular.copy($scope.currentInfo),
              domain: angular.copy($scope.selectedDomain.domain),
            };
          },
          domains: () => {
            return angular.copy($scope.domains);
          },
          showDomains: () => {
            return showDomains();
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showDownloadLinkOfFilesSelected() {
      showDownloadLinks($scope.sel.has);
    }

    function showDownloadLinks(items) {
      $modal.open({
        templateUrl: "main/files/modals/show-download-links-modal.html",
        controller: "showDownloadLinksModalCtrl",
        resolve: {
          items: () => {
            return angular.copy(items);
          },
          current: () => {
            return {
              info: angular.copy($scope.currentInfo),
              domain: angular.copy($scope.selectedDomain.domain),
            };
          },
          domains: () => {
            return angular.copy($scope.domains);
          },
          showDomains: () => {
            return showDomains();
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showACL(item) {
      $modal.open({
        templateUrl: "main/files/modals/update-acl-modal.html",
        controller: "updateACLModalCtrl",
        resolve: {
          item: () => {
            return angular.copy(item);
          },
          currentInfo: () => {
            return angular.copy($scope.currentInfo);
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showRestore(item) {
      $modal.open({
        templateUrl: "main/files/modals/restore-modal.html",
        controller: "restoreModalCtrl",
        resolve: {
          item: () => {
            return angular.copy(item);
          },
          currentInfo: () => {
            return angular.copy($scope.currentInfo);
          },
          callback: () => {
            return () => {
              $timeout(() => {
                s3Client.loadStorageStatus(
                  $scope.currentInfo.region,
                  $scope.currentInfo.bucket, [item]
                );
              }, 300);
            };
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showCRC(item) {
      $modal.open({
        templateUrl: "main/files/modals/crc-modal.html",
        controller: "crcModalCtrl",
        resolve: {
          item: () => {
            return angular.copy(item);
          },
          currentInfo: () => {
            return angular.copy($scope.currentInfo);
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showDownload(item) {
      const bucketInfo = angular.copy($scope.currentInfo),
            fromInfo = angular.copy(item),
            domain = angular.copy($scope.selectedDomain.domain);

      fromInfo.region = bucketInfo.region;
      fromInfo.bucket = bucketInfo.bucket;
      fromInfo.domain = domain;
      Dialog.showDownloadDialog((folderPaths) => {
        if (!folderPaths || folderPaths.length == 0) {
          return;
        }
        const to = folderPaths[0].replace(/(\/*$)/g, "");
        $scope.handlers.downloadFilesHandler([fromInfo], to);
      });
    }

    function showDeleteFilesSelected() {
      showDeleteFiles($scope.sel.has);
    }

    function showDeleteFiles(items) {
      $modal.open({
        templateUrl: "main/files/modals/delete-files-modal.html",
        controller: "deleteFilesModalCtrl",
        backdrop: "static",
        resolve: {
          items: () => {
            return items;
          },
          currentInfo: () => {
            return angular.copy($scope.currentInfo);
          },
          callback: () => {
            return () => {
              $timeout(() => {
                listFiles();
              }, 300);
            };
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    ////////////////////////
    function selectBucket(item) {
      $timeout(() => {
        if ($scope.bucket_sel == item) {
          $scope.bucket_sel = null;
        } else {
          $scope.bucket_sel = item;
        }
      });
    }

    function selectFile(item) {
      $timeout(() => {
        var idx = $scope.objects.indexOf(item);
        if (idx > -1) {
          $scope.sel.x[`i_${idx}`] = !$scope.sel.x[`i_${idx}`];

          var subidx = $scope.sel.has.indexOf(item);
          if (subidx > -1) {
            if (!$scope.sel.x[`i_${idx}`]) {
              $scope.sel.has.splice(subidx, 1);
            }
          } else {
            if ($scope.sel.x[`i_${idx}`]) {
              $scope.sel.has.push(item);
            }
          }

          $scope.sel.all = $scope.sel.has.length == $scope.objects.length;
        }
      });
    }

    function selectExternalPath(item) {
      $timeout(() => {
        if ($scope.external_path_sel == item) {
          $scope.external_path_sel = null;
        } else {
          $scope.external_path_sel = item;
        }
      });
    }

    function initBucketSelect() {
      $timeout(() => {
        $scope.bucket_sel = null;
      });
    }

    function initFilesSelect() {
      $timeout(() => {
        $scope.sel.all = false;
        $scope.sel.has = [];
        $scope.sel.x = {};
      });
    }

    function initExternalPathSelect() {
      $timeout(() => {
        $scope.external_path_sel = null;
      });
    }

    function clearFilesList() {
      initFilesSelect();

      $timeout(() => {
        $scope.objects = [];
        $scope.nextObjectsMarker = null;
      });
    }

    ////////////////////////////////
    var uploadDialog, downloadDialog;

    function showUploadDialog() {
      if (uploadDialog) return;

      uploadDialog = true;
      $timeout(() => {
        uploadDialog = false;
      }, 600);

      Dialog.showUploadDialog((filePaths) => {
        if (!filePaths || filePaths.length == 0) {
          return;
        }

        $scope.handlers.uploadFilesHandler(filePaths, angular.copy($scope.currentInfo));
      });
    }

    function showDownloadDialog() {
      if (downloadDialog) return;

      downloadDialog = true;
      $timeout(() => {
        downloadDialog = false;
      }, 600);

      Dialog.showDownloadDialog((folderPaths) => {
        if (!folderPaths || folderPaths.length == 0 || $scope.sel.has.length == 0) {
          return;
        }

        tryDownloadFiles(folderPaths[0]);
      });
    }

    function tryDownloadFiles(to) {
      to = to.replace(/(\/*$)/g, "");

      const selectedFiles = angular.copy($scope.sel.has);
      angular.forEach(selectedFiles, (n) => {
        n.region = $scope.currentInfo.region;
        n.bucket = $scope.currentInfo.bucket;
        n.domain = angular.copy($scope.selectedDomain.domain);
      });
      /**
       * @param fromS3Path {array}  item={region, bucket, path, name, size }
       * @param toLocalPath {string}
       */
      $scope.handlers.downloadFilesHandler(selectedFiles, to);
    }

    /**
     * 监听 drop
     * @param e
     * @returns {boolean}
     */
    function handlerDrop(e) {
      e.preventDefault();
      e.stopPropagation();

      var files = e.originalEvent.dataTransfer.files;
      var filePaths = [];
      if (files) {
        angular.forEach(files, (n) => {
          filePaths.push(n.path);
        });
      }

      $scope.handlers.uploadFilesHandler(filePaths, angular.copy($scope.currentInfo));

      return false;
    }

    function showBucketsTable(buckets) {
      initBucketSelect();
      KodoClient.getRegionLabels().then((regions) => {
        var $list = $('#bucket-list').bootstrapTable({
          columns: [{
            field: 'id',
            title: '-',
            radio: true
          }, {
            field: 'name',
            title: T('bucket.name'),
            formatter: (val, row, idx, field) => {
              return `<i class="fa fa-database text-warning"></i> <a href=""><span>${val}</span></a>`;
            },
            events: {
              'click a': (evt, val, row, idx) => {
                gotoAddress(val);

                return false;
              }
            }
          }, {
            field: 'region',
            title: T('bucket.region'),
            formatter: (id) => {
              if (id === null) {
                return T('region.get.error');
              }
              let regionLabel = T('region.unknown');
              each(regions, (region) => {
                if (region.id === id && region.label) {
                  regionLabel = region.label;
                }
              })
              return regionLabel;
            }
          }, {
            field: 'creationDate',
            title: T('creationTime'),
            formatter: (val) => {
              return $filter('timeFormat')(val);
            }
          }],
          clickToSelect: true,
          onCheck: (row, $row) => {
            if (row == $scope.bucket_sel) {
              $row.parents('tr').removeClass('info');

              $list.bootstrapTable('uncheckBy', {
                field: 'name',
                values: [row.name],
              });

              $timeout(() => {
                $scope.bucket_sel = null;
              });
            } else {
              $list.find('tr').removeClass('info');
              $row.parents('tr').addClass('info');

              $timeout(() => {
                $scope.bucket_sel = row;
              });
            }

            return false;
          }
        });

        $list.bootstrapTable('load', buckets).bootstrapTable('uncheckAll');
      }, (err) => {
        console.error(err);
        Toast.error(err);
      })
    }

    function showExternalPathsTable(externalPaths) {
      initExternalPathSelect();
      KodoClient.getRegionLabels().then((regions) => {
        var $list = $('#external-path-list').bootstrapTable({
          columns: [{
            field: 'id',
            title: '-',
            radio: true
          }, {
            field: 'fullPath',
            title: T('externalPath.path'),
            formatter: (val, row, idx, field) => {
              return `<i class="fa fa-map-signs text-warning"></i> <a href=""><span>${val}</span></a>`;
            },
            events: {
              'click a': (evt, val, row, idx) => {
                gotoAddress(val);

                return false;
              }
            }
          }, {
            field: 'regionId',
            title: T('region'),
            formatter: (id) => {
              if (id === null) {
                return T('region.get.error');
              }
              let regionLabel = T('region.unknown');
              each(regions, (region) => {
                if (region.id === id && region.label) {
                  regionLabel = region.label;
                }
              })
              return regionLabel;
            }
          }],
          clickToSelect: true,
          onCheck: (row, $row) => {
            if (row === $scope.external_path_sel) {
              $row.parents('tr').removeClass('info');

              $list.bootstrapTable('uncheckBy', {
                field: 'fullPath',
                values: [row.fullPath],
              });

              $timeout(() => {
                $scope.external_path_sel = null;
              });
            } else {
              $list.find('tr').removeClass('info');
              $row.parents('tr').addClass('info');

              $timeout(() => {
                $scope.external_path_sel = row;
              });
            }

            return false;
          }
        });

        $list.bootstrapTable('load', externalPaths).bootstrapTable('uncheckAll');
      }, (err) => {
        console.error(err);
        Toast.error(err);
      });
    }

    function showFilesTable(files, isAppend) {
      if (!isAppend) {
        initFilesSelect();
      }
      var $list = $('#file-list').bootstrapTable({
        columns: [{
          field: 'id',
          title: '-',
          checkbox: true
        }, {
          field: 'name',
          title: T('name'),
          formatter: (val, row, idx, field) => {
            let htmlAttributes = '';
            if (row.StorageClass) {
              htmlAttributes = `data-storage-class="${row.StorageClass.toLowerCase()}" data-key="${Base64.encode(row.Key)}" data-region="${$scope.currentInfo.region}" data-bucket="${$scope.currentInfo.bucket}"`;
            }
            return `
              <div class="text-overflow file-item-name" style="cursor:pointer; ${row.isFolder?'color:orange':''}" ${htmlAttributes}>
                <i class="fa fa-${$filter('fileIcon')(row)}"></i>
                <a href="" style="width: 800px; display: inline-block;"><span>${$filter('htmlEscape')(val)}</span></a>
              </div>
            `;
          },
          events: {
            'click a': (evt, val, row, idx) => {
              if (row.isFolder) {
                $timeout(() => {
                  $scope.total_folders = 0;
                });

                gotoAddress($scope.currentBucketName, row.path);
              }

              return false;
            },
            'dblclick a': (evt, val, row, idx) => {
              if (row.isFolder) {
                $timeout(() => {
                  $scope.total_folders = 0;
                });

                gotoAddress($scope.currentBucketName, row.path);
              } else {
                showPreview(row);
              }

              return false;
            }
          }
        }, {
          field: 'size',
          title: `${T('type')} / ${T('size')}`,
          formatter: (val, row, idx, field) => {
            if (row.isFolder) {
              return `<span class="text-muted">${T('folder')}</span>`;
            }

            return $filter('sizeFormat')(val);
          }
        }, {
          field: 'storageClass',
          title: T('storageClassesType'),
          formatter: (val, row, idx, field) => {
            if (row.isFolder) {
              return `<span class="text-muted">${T('folder')}</span>`;
            } else if (row.storageClass) {
              return T(`storageClassesType.${row.storageClass.toLowerCase()}`);
            } else {
              return '-';
            }
          }
        }, {
          field: 'lastModified',
          title: T('lastModifyTime'),
          formatter: (val, row, idx, field) => {
            if (row.isFolder) {
              return '-';
            }

            return $filter('timeFormat')(val);
          }
        }, {
          field: 'actions',
          title: T('actions'),
          formatter: (val, row, idx, field) => {
            if (!$scope.currentBucketPerm) {
              return "-";
            }

            var acts = ['<div class="btn-group btn-group-xs">'];
            if (row.StorageClass && row.StorageClass.toLowerCase() == 'glacier') {
              acts.push(`<button type="button" class="btn unfreeze text-warning" data-toggle="tooltip" data-toggle-i18n="restore"><span class="fa fa-fire"></span></button>`);
            }
            if ($scope.currentBucketPerm.read) {
              acts.push(`<button type="button" class="btn download" data-toggle="tooltip" data-toggle-i18n="download"><span class="fa fa-download"></span></button>`);
              if (!row.isFolder) {
                acts.push(`<button type="button" class="btn download-link" data-toggle="tooltip" data-toggle-i18n="getDownloadLink"><span class="fa fa-link"></span></button>`);
              }
            }
            if ($scope.currentBucketPerm.remove) {
              acts.push(`<button type="button" class="btn remove text-danger" data-toggle="tooltip" data-toggle-i18n="delete"><span class="fa fa-trash"></span></button>`);
            }
            acts.push('</div>');
            return acts.join("");
          },
          events: {
            'click button.download': (evt, val, row, idx) => {
              showDownload(row);

              return false;
            },
            'click button.download-link': (evt, val, row, idx) => {
              showDownloadLink(row);

              return false;
            },
            'click button.remove': (evt, val, row, idx) => {
              showDeleteFiles([row]);

              $timeout(() => {
                $scope.total_folders = $list.find('i.fa-folder').length;
              });

              return false;
            },
            'click button.unfreeze': (evt, val, row, idx) => {
              const region = $scope.currentInfo.region,
                    bucket = $scope.currentInfo.bucket,
                    key = row.Key;
              isFrozenOrNot(region, bucket, key, {
                'frozen': () => {
                  showRestore(row);
                },
                'unfreezing': () => {
                  Dialog.alert(T('restore.title'), T('restore.message.unfreezing'));
                },
                'unfrozen': () => {
                  Dialog.alert(T('restore.title'), T('restore.message.unfrozen'));
                },
                'error': (err) => {
                  Dialog.alert(T('restore.title'), T('restore.message.head_error'));
                },
              });
              return false;
            }
          }
        }],
        rowStyle: (row, idx) => {
          if (row.WithinFourHours) {
            return {
              classes: 'warning'
            };
          }

          return {};
        },
        onCheck: (row, $row) => {
          $row.parents('tr').addClass('info');

          $timeout(() => {
            $scope.sel.x[`i_${$row.data('index')}`] = true;

            var idx = $scope.sel.has.indexOf(row);
            if (idx < 0) {
              $scope.sel.has.push(row);
            }

            $scope.sel.all = $scope.sel.has.length == $scope.objects.length;
          });
        },
        onUncheck: (row, $row) => {
          $row.parents('tr').removeClass('info');

          $timeout(() => {
            $scope.sel.x[`i_${$row.data('index')}`] = false;

            var idx = $scope.sel.has.indexOf(row);
            if (idx > -1) {
              $scope.sel.has.splice(idx, 1);
            }

            $scope.sel.all = $scope.sel.has.length == $scope.objects.length;
          });
        },
        onCheckAll: (rows) => {
          $list.find('tr').removeClass('info').addClass('info');

          initFilesSelect();

          $timeout(() => {
            $scope.sel.all = true;
            $scope.sel.has = rows;

            angular.forEach(rows, (row, idx) => {
              $scope.sel.x[`i_${idx}`] = true;
            });
          });
        },
        onUncheckAll: (rows) => {
          $list.find('tr').removeClass('info');

          initFilesSelect();
        }
      });

      if (isAppend) {
        $list.bootstrapTable('append', files);
      } else {
        $list.bootstrapTable('load', files).bootstrapTable('uncheckAll');
      }
      angular.forEach($('#file-list tbody tr [data-storage-class="glacier"]'), (row) => {
        let isMouseOver = true;
        const region = $(row).attr('data-region'),
              bucket = $(row).attr('data-bucket'),
              key = Base64.decode($(row).attr('data-key')),
              span = $(row).find('a span'),
              addTooltip = (status) => {
                span.tooltip('destroy');
                $timeout(() => {
                  if (isMouseOver) {
                    span.attr('data-toggle', 'tooltip');
                    span.attr('data-placement', 'right');
                    span.tooltip({ delay: 0, title: T(`restore.tooltip.${status}`), trigger: 'hover' });
                    span.tooltip('show');
                  }
                }, 100);
              };
        $(span).off('mouseover').on('mouseover', () => {
          isMouseOver = true;
          isFrozenOrNot(region, bucket, key, {
            frozen: () => { addTooltip('frozen'); },
            unfreezing: () => { addTooltip('unfreezing'); },
            unfrozen: () => { addTooltip('unfrozen'); },
          });
        }).off('mouseleave').on('mouseleave', () => {
          isMouseOver = false;
        });
      });
      angular.forEach($('#file-list tbody tr .btn-group button[type="button"][data-toggle="tooltip"]'), (button) => {
        $(button).tooltip('destroy');
        $(button).attr('data-placement', 'top');
        const i18nKey = $(button).attr('data-toggle-i18n');
        $(button).tooltip({ container: 'body', title: T(i18nKey), trigger: 'hover' });
      });

      $timeout(() => {
        $scope.total_folders = $list.find('i.fa-folder').length;
      });
    }
  }
]);
