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
  "Config",
  "s3Client",
  "fileSvs",
  "Toast",
  "Dialog",
  "Customize",
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
    Config,
    s3Client,
    fileSvs,
    Toast,
    Dialog,
    Customize
  ) {
    const filter = require("array-filter");
    const deepEqual = require('fast-deep-equal');
    const T = $translate.instant;

    angular.extend($scope, {
      showTab: 1,

      ref: {
        isBucketList: false,
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
        objectName: ""
      },
      searchObjectName: searchObjectName,
      searchBucketName: searchBucketName,

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

      // bucket ops
      showAddBucket: showAddBucket,
      showUpdateBucket: showUpdateBucket,
      showBucketMultipart: showBucketMultipart,
      showDeleteBucket: showDeleteBucket,

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
      showDownloadLink: showDownloadLink,
      showPreview: showPreview,
      showACL: showACL,

      showPaste: showPaste,
      cancelPaste: cancelPaste
    });

    $scope.$watch("ref.isListView", (v) => {
      if ($scope.ref.isBucketList) {
        initBucketSelect();
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

        if ($scope.ref.isBucketList) {
          showBucketsTable($scope.buckets);
        } else {
          showFilesTable($scope.objects);
        }
      });
    });

    /////////////////////////////////
    function gotoAddress(bucket, prefix) {
      var kodopath = "kodo://";
      if (bucket) {
        kodopath += `${bucket}/${prefix || ""}`;
      }

      $rootScope.$broadcast("gotoKodoAddress", kodopath);
    }

    function getCurrentPath() {
      return `kodo://${$scope.currentInfo.bucketName}/${$scope.currentInfo.key}`;
    }

    /////////////////////////////////
    var refreshTid;

    $scope.$on("refreshFilesList", (e) => {
      $timeout.cancel(refreshTid);

      refreshTid = $timeout(() => {
        gotoAddress($scope.currentInfo.bucketName, $scope.currentInfo.key);
      }, 600);
    });

    var searchTid;

    function searchObjectName() {
      $timeout.cancel(searchTid);

      searchTid = $timeout(() => {
        var info = angular.copy($scope.currentInfo);

        info.key += $scope.sch.objectName;
        listFiles(info);
      }, 600);
    }

    function searchBucketName() {
      $timeout.cancel(searchTid);
      searchTid = $timeout(listBuckets, 600);
    }

    var uploadsTid;

    function uploadsChange() {
      $timeout.cancel(uploadsTid);

      uploadsTid = $timeout(() => {
        if ($scope.mock.uploads) {
          var uploads = $scope.mock.uploads.split(",");
          $scope.handlers.uploadFilesHandler(uploads, $scope.currentInfo);
        }
      }, 600);
    }

    var downloadsTid;

    function downloadsChange() {
      $timeout.cancel(downloadsTid);

      downloadsTid = $timeout(() => {
        if ($scope.mock.downloads) {
          tryDownloadFiles($scope.mock.downloads);
        }
      }, 600);
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

      if (user.s3path) {
        $scope.ref.isBucketList = false;

        var bucket = s3Client.parseKodoPath(user.s3path).bucket;

        $rootScope.bucketMap = {};
        s3Client.getBucketLocation(bucket).then((regionId) => {
          $rootScope.bucketMap[bucket] = { region: regionId };
          $timeout(() => {
            addEvents();
            $scope.$broadcast("filesViewReady");
          });
        }, (err) => {
          console.error("Failed to get bucket location, go away!", err);
          Auth.logout().then(() => {
            $location.url("/login");
          });
        });
      } else {
        $scope.ref.isBucketList = true;
        $timeout(() => {
          addEvents();
          $scope.$broadcast("filesViewReady");
        });
      }
    }

    function addEvents() {
      $scope.$on("kodoAddressChange", (evt, addr, forceRefresh) => {
        evt.stopPropagation();

        console.log(`on:kodoAddressChange: ${addr}, forceRefresh: ${!!forceRefresh}`);

        var info = s3Client.parseKodoPath(addr);

        $scope.currentInfo = info;

        if (info.key) {
          var lastGan = info.key.lastIndexOf("/");

          // if not endswith /
          if (lastGan != info.key.length - 1) {
            var fileKey = info.key,
              fileName = info.key.substring(lastGan + 1);

            info.key = info.key.substring(0, lastGan + 1);
          }
        }

        if (info.bucket) {
          // list objects
          var bucketInfo = $rootScope.bucketMap[info.bucket]
          if (bucketInfo) {
            $scope.currentInfo.region = bucketInfo.region;
            info.bucketName = bucketInfo.name;
            info.bucket = bucketInfo.bucketId;
          } else {
            Toast.error("Forbidden");

            clearFilesList();
            return;
          }

          $scope.currentBucket = info.bucket;
          $scope.currentBucketName = info.bucketName;
          $scope.ref.isBucketList = false;

          // try to resolve bucket perm
          var user = $rootScope.currentUser;
          if (user.perm) {
            if (user.isSuper) {
              $scope.currentBucketPerm = user.perm;
            } else {
              $scope.currentBucketPerm = user.perm[info.bucket];
            }
          }

          // search
          if (fileName) {
            $scope.sch.objectName = fileName;

            searchObjectName();
          } else {
            $timeout(() => {
              listFiles();
            }, 100);
          }
        } else {
          // list buckets
          $scope.currentBucket = null;
          $scope.ref.isBucketList = true;

          $timeout(() => {
            listBuckets();
          }, 100);
        }
      });
    }

    function listBuckets(fn) {
      clearFilesList();

      $timeout(() => {
        $scope.isLoading = true;
      });

      s3Client.listAllBuckets().then((buckets) => {
        if ($scope.sch.bucketName) {
          buckets = filter(buckets, (bkt) => { return bkt.name.indexOf($scope.sch.bucketName) >= 0; });
        }

        $timeout(() => {
          $scope.buckets = buckets;

          var m = {};
          var wait = buckets.length;
          if (wait > 0) {
            angular.forEach(buckets, (bkt) => {
              m[bkt.name] = bkt;
              s3Client.getBucketLocation(bkt.bucketId).then((regionId) => {
                bkt.region = regionId;
                wait -= 1;
                if (wait == 0) {
                  $timeout(() => {
                    $scope.isLoading = false;
                    showBucketsTable(buckets);
                    if (fn) fn(null);
                  });
                }
              }, (err) => {
                console.error("get bucket location error", bkt.bucketId, err);
                wait -= 1;
                if (fn) fn(err);
              });
            });
          } else {
            $scope.isLoading = false;
            showBucketsTable([]);
            if (fn) fn(null);
          }
          $rootScope.bucketMap = m;
        });
      }, (err) => {
        console.error("list buckets error", err);

        $timeout(() => {
          $scope.isLoading = false;
        });

        if (fn) fn(err);
      });
    }

    function listFiles(info, marker, fn) {
      clearFilesList();

      $timeout(() => {
        $scope.isLoading = true;
      });

      tryListFiles((info || $scope.currentInfo), marker, (err, files) => {
        if (err) {
          Toast.error(JSON.stringify(err));
          return;
        }

        $timeout(() => {
          $scope.isLoading = false;
        });

        showFilesTable(files);
      });
    }

    function tryListFiles(info, marker, fn) {
      if (!info || !info.bucket) {
        return;
      }

      s3Client.listFiles(info.region, info.bucket, info.key, marker || "").then((result) => {
        $timeout(() => {
          if ($scope.info && !deepEqual($scope.info, info)) {
            return;
          }
          $scope.objects = $scope.objects.concat(result.data);
          $scope.nextObjectsMarker = result.marker || null;

          if ($scope.nextObjectsMarker) {
            $timeout(tryLoadMore, 100);
          }
        });

        if (fn) fn(null, result.data);

      }, (err) => {
        console.error(`list files: kodo://${info.bucketName}/${info.key}?marker=${marker}`, err);

        clearFilesList();

        if (fn) fn(err);
      });
    }

    function tryLoadMore() {
      if ($scope.nextObjectsMarker) {
        var info = $scope.currentInfo;

        console.log(`loading next kodo://${info.bucketName}/${info.key}?marker=${$scope.nextObjectsMarker}`);

        tryListFiles(info, $scope.nextObjectsMarker, (err, files) => {
          if (err) {
            Toast.error(JSON.stringify(err));
            return;
          }

          showFilesTable(files, true);
        });
      }
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

              $timeout(() => {
                listBuckets();
              }, 500);
            };
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showUpdateBucket(item) {
      $modal.open({
        templateUrl: "main/files/modals/update-bucket-modal.html",
        controller: "updateBucketModalCtrl",
        resolve: {
          item: () => {
            return item;
          },
          callback: () => {
            return () => {
              Toast.success(T("bucketACL.update.success"));

              $timeout(() => {
                listBuckets();
              }, 300);
            };
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showBucketMultipart(item) {
      $modal.open({
        templateUrl: "main/files/modals/bucket-multipart-modal.html",
        controller: "bucketMultipartModalCtrl",
        size: "lg",
        backdrop: "static",
        resolve: {
          bucketInfo: () => {
            return item;
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showDeleteBucket(item) {
      var title = T("bucket.delete.title"),
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
              Toast.success(T("bucket.delete.success")); //删除Bucket成功

              $timeout(() => {
                listBuckets();
              }, 1000);
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

              $timeout(() => {
                listFiles();
              }, 300);
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
              grant: () => {
                showGrant([item]);
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

    function showGrant(items) {
      $modal.open({
        templateUrl: "main/files/modals/grant-modal.html",
        controller: "grantModalCtrl",
        resolve: {
          items: () => {
            return items;
          },
          currentInfo: () => {
            return angular.copy($scope.currentInfo);
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showGrantToken(item) {
      $modal.open({
        templateUrl: "main/files/modals/grant-token-modal.html",
        controller: "grantTokenModalCtrl",
        resolve: {
          item: () => {
            return item;
          },
          currentInfo: () => {
            return angular.copy($scope.currentInfo);
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
          currentInfo: () => {
            return angular.copy($scope.currentInfo);
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
      var bucketInfo = angular.copy($scope.currentInfo),
        fromInfo = angular.copy(item);

      fromInfo.region = bucketInfo.region;
      fromInfo.bucket = bucketInfo.bucket;

      Dialog.showDownloadDialog((folderPaths) => {
        if (!folderPaths || folderPaths.length == 0) {
          Toast.info(T('chooseone'));

          return;
        }

        var to = folderPaths[0].replace(/(\/*$)/g, "");

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

    function clearFilesList() {
      initFilesSelect();

      $timeout(() => {
        $scope.objects = [];
        $scope.info = null;
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
          Toast.info(T('choosenone'));

          return;
        }

        $scope.handlers.uploadFilesHandler(filePaths, $scope.currentInfo);
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
          Toast.info(T('choosenone'));

          return;
        }

        tryDownloadFiles(folderPaths[0]);
      });
    }

    function tryDownloadFiles(to) {
      to = to.replace(/(\/*$)/g, "");

      var selectedFiles = angular.copy($scope.sel.has);
      angular.forEach(selectedFiles, (n) => {
        n.region = $scope.currentInfo.region;
        n.bucket = $scope.currentInfo.bucket;
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

      $scope.handlers.uploadFilesHandler(filePaths, $scope.currentInfo);

      return false;
    }

    function showBucketsTable(buckets) {
      initBucketSelect();
      const regions = Config.load(AuthInfo.usePublicCloud()).regions;
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
          formatter: (val) => {
            let name = T('region.unknown');
            angular.forEach(regions, (region) => {
              if (region.id === val) {
                name = region.label;
              }
            })
            return name;
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
            return `<div class="text-overflow file-item-name" style="cursor:pointer; ${row.isFolder?'color:orange':''}"><i class="fa fa-${$filter('fileIcon')(row)}"></i> <a href=""><span>${$filter('htmlEscape')(val)}</span></a></div>`;
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
            if ($scope.currentBucketPerm.read) {
              acts.push(`<button type="button" class="btn download"><span class="fa fa-download"></span></button>`);
              if (!row.isFolder) {
                acts.push(`<button type="button" class="btn download-link"><span class="fa fa-link"></span></button>`);
              }
            }
            if ($scope.currentBucketPerm.remove) {
              acts.push(`<button type="button" class="btn remove text-danger"><span class="fa fa-trash"></span></button>`);
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

      $timeout(() => {
        $scope.total_folders = $list.find('i.fa-folder').length;
      });
    }
  }
]);
