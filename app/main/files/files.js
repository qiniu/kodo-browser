angular.module("web").controller("filesCtrl", [
  "$scope",
  "$rootScope",
  "$uibModal",
  "$timeout",
  "$translate",
  "$location",
  "Auth",
  "AuthInfo",
  "osClient",
  "settingsSvs",
  "fileSvs",
  "safeApply",
  "Toast",
  "Dialog",
  function (
    $scope,
    $rootScope,
    $modal,
    $timeout,
    $translate,
    $location,
    Auth,
    AuthInfo,
    osClient,
    settingsSvs,
    fileSvs,
    safeApply,
    Toast,
    Dialog
  ) {
    var T = $translate.instant;

    angular.extend($scope, {
      showTab: 1,
      keepMoveOptions: null,

      ref: {
        isBucketList: false,
        isListView: true,
        bucketPerm: {}
      },

      transVisible: localStorage.getItem("transVisible") == "true",
      toggleTransVisible: function (visible) {
        $scope.transVisible = visible;
        localStorage.setItem("transVisible", visible);
      },

      goIn: goIn,
      getCurrentS3path: getCurrentS3path,

      //bucket ops
      showBucketMultipart: showBucketMultipart,
      showAddBucket: showAddBucket,
      showUpdateBucket: showUpdateBucket,
      showDeleteBucket: showDeleteBucket,

      //object ops
      showAddFolder: showAddFolder,
      showRename: showRename,
      showMove: showMove,
      showDeleteFiles: showDeleteFiles,
      showDeleteFilesSelected: showDeleteFilesSelected,
      tryLoadMore: tryLoadMore,

      //search
      sch: {
        bucketName: "",
        objectName: ""
      },
      searchObjectName: searchObjectName,

      //selection
      sel: {
        hasArchive: false,
        all: false, //boolean
        has: false, //[] item: s3Object={name,path,...}
        x: {} //{} {'i_'+$index, true|false}
      },
      selectAll: selectAll,
      selectChanged: selectChanged,

      //bucket selection
      bucket_sel: {
        item: null
      },
      selectBucket: selectBucket,

      //upload && download
      handlers: {
        uploadFilesHandler: null,
        downloadFilesHandler: null
      },
      handlerDrop: handlerDrop,
      showUploadDialog: showUploadDialog,
      showDownloadDialog: showDownloadDialog,
      showDownload: showDownload,

      //utils
      showAddress: showAddress,
      showPreview: showPreview,
      showACL: showACL,
      showHttpHeaders: showHttpHeaders,

      showPaste: showPaste,
      cancelPaste: cancelPaste,

      mock: {
        uploads: "",
        downloads: "",
        uploadsChange: uploadsChange,
        downloadsChange: downloadsChange
      }
    });

    $scope.fileSpacerMenuOptions = [
      [
        function () {
          return (
            '<i class="glyphicon glyphicon-cloud-upload text-info"></i> ' +
            T("upload")
          );
        },
        function ($itemScope, $event) {
          showUploadDialog();
        },
        function () {
          return $scope.currentAuthInfo.privilege != "readOnly";
        }
      ],
      [
        function () {
          return (
            '<i class="glyphicon glyphicon-plus text-success"></i> ' +
            T("folder.create")
          );
        },
        function ($itemScope, $event) {
          showAddFolder();
        },
        function () {
          return $scope.currentAuthInfo.privilege != "readOnly";
        }
      ],

      [
        function () {
          return (
            '<i class="fa fa-paste text-primary"></i> ' +
            T("paste") +
            ($scope.keepMoveOptions ?
              "(" + $scope.keepMoveOptions.items.length + ")" :
              "")
          );
        },
        function ($itemScope, $event) {
          showPaste();
        },
        function () {
          return $scope.keepMoveOptions;
        }
      ]
    ];
    $scope.fileMenuOptions = function (item, $index) {
      if ($scope.sel.x["i_" + $index]) {
        //pass
      } else {
        $scope.objects.forEach(function (n, i) {
          $scope.sel.x["i_" + i] = false;
        });
        $scope.sel.x["i_" + $index] = true;
        selectChanged();
      }

      return [
        [
          function () {
            //download
            return (
              '<i class="glyphicon glyphicon-cloud-download text-primary"></i> ' +
              T("download")
            );
          },
          function ($itemScope, $event) {
            showDownloadDialog();
          },
          function () {
            return $scope.sel.has;
          }
        ],
        [
          function () {
            //copy
            return '<i class="fa fa-clone text-primary"></i> ' + T("copy");
          },
          function ($itemScope, $event) {
            showMove($scope.sel.has, true);
          },
          function () {
            return (
              $scope.sel.has && $scope.currentAuthInfo.privilege != "readOnly"
            );
          }
        ],

        [
          function () {
            //move
            return '<i class="fa fa-cut text-primary"></i> ' + T("move");
          },
          function ($itemScope, $event) {
            showMove($scope.sel.has);
          },
          function () {
            return (
              $scope.sel.has && $scope.currentAuthInfo.privilege != "readOnly"
            );
          }
        ],

        [
          function () {
            return '<i class="fa fa-edit text-info"></i> ' + T("rename");
          },
          function ($itemScope, $event) {
            showRename($scope.sel.has[0]);
          },
          function () {
            return (
              $scope.sel.has &&
              $scope.sel.has.length == 1 &&
              $scope.currentAuthInfo.privilege != "readOnly" &&
              $scope.sel.has[0].storageClass != "Archive"
            );
          }
        ],

        [
          function () {
            //获取地址
            return '<i class="fa fa-download"></i> ' + T("getAddress");
          },
          function ($itemScope, $event) {
            showAddress($scope.sel.has[0]);
          },
          function () {
            return (
              $scope.sel.has &&
              $scope.sel.has.length == 1 &&
              !$scope.sel.has[0].isFolder &&
              $scope.currentAuthInfo.id.indexOf("STS.") != 0
            );
          }
        ],

        [
          function () {
            //Http头
            return '<i class="fa fa-cog"></i> ' + T("http.headers");
          },
          function ($itemScope, $event) {
            showHttpHeaders($scope.sel.has[0]);
          },
          function () {
            return (
              $scope.sel.has &&
              $scope.sel.has.length == 1 &&
              !$scope.sel.has[0].isFolder
            );
          }
        ],

        [
          function () {
            return '<i class="fa fa-remove text-danger"></i> ' + T("delete");
          },
          function ($itemScope, $event) {
            showDeleteFilesSelected();
          },
          function () {
            return (
              $scope.sel.has && $scope.currentAuthInfo.privilege != "readOnly"
            );
          }
        ]
      ];
    };

    $scope.bucketSpacerMenuOptions = [
      [
        function () {
          return (
            '<i class="glyphicon glyphicon-plus text-success"></i> ' +
            T("bucket.add")
          );
        },
        function ($itemScope, $event) {
          showAddBucket();
        }
      ]
    ];
    $scope.bucketMenuOptions = [
      [
        function ($itemScope, $event, modelValue, text, $li) {
          $scope.bucket_sel.item = $itemScope.item;
          return (
            '<i class="fa fa-shield text-warning"></i> ' + T("simplePolicy")
          );
        },
        function ($itemScope, $event) {
          // Action
          showGrant([$scope.bucket_sel.item]);
        }
      ],

      [
        function ($itemScope, $event, modelValue, text, $li) {
          $scope.bucket_sel.item = $itemScope.item;
          return '<i class="fa fa-remove text-danger"></i> ' + T("delete");
        },
        function ($itemScope, $event) {
          // Action
          showDeleteBucket($scope.bucket_sel.item);
        }
      ]
    ];

    /////////////////////////////////
    function goIn(bucket, prefix) {
      var s3path = "s3://";
      if (bucket) {
        s3path = `s3://${bucket}/${prefix || ""}`;
      }

      $rootScope.$broadcast("gotoS3Address", s3path);
    }

    function getCurrentS3path() {
      return `s3://${$scope.currentInfo.bucket}/${$scope.currentInfo.key}`;
    }

    /////////////////////////////////
    var searchTid;

    function searchObjectName() {
      $timeout.cancel(searchTid);

      searchTid = $timeout(function () {
        var info = angular.copy($scope.currentInfo);

        info.key += $scope.sch.objectName;
        listFiles(info);
      }, 600);
    }

    var uploadsTid;

    function uploadsChange() {
      $timeout.cancel(uploadsTid);
      uploadsTid = $timeout(function () {
        if ($scope.mock.uploads) {
          var arr = $scope.mock.uploads.split(",");
          $scope.handlers.uploadFilesHandler(arr, $scope.currentInfo);
        }
      }, 600);
    }

    var downloadsTid;

    function downloadsChange() {
      $timeout.cancel(downloadsTid);
      downloadsTid = $timeout(function () {
        if ($scope.mock.downloads) {
          _downloadMulti($scope.mock.downloads);
        }
      }, 600);
    }

    var refreshTid;

    $scope.$on("needrefreshfilelists", function (e) {
      $timeout.cancel(refreshTid);

      refreshTid = $timeout(function () {
        goIn($scope.currentInfo.bucket, $scope.currentInfo.key);
      }, 600);
    });

    /////////////////////////////////
    $timeout(init, 100);

    function init() {
      var authInfo = AuthInfo.get();
      if (!authInfo.isAuthed) {
        Auth.logout().then(function () {
          $location.url("/login");
        });

        return;
      }

      $rootScope.currentAuthInfo = authInfo;

      if (authInfo.s3path) {
        $scope.ref.isBucketList = false;

        var bucket = osClient.parseS3Path(authInfo.s3path).bucket;

        $rootScope.bucketMap = {};
        $rootScope.bucketMap[bucket] = {
          region: authInfo.region
        };

        $timeout(function () {
          addEvents();
          $scope.$broadcast("filesViewReady");
        });
      } else {
        $scope.ref.isBucketList = true;

        listBuckets(function () {
          addEvents();
          $scope.$broadcast("filesViewReady");
        });
      }
    }

    function addEvents() {
      $scope.$on("s3AddressChange", function (e, addr, forceRefresh) {
        console.log(`on:s3AddressChange: ${addr}, forceRefresh: ${!!forceRefresh}`);

        var info = osClient.parseS3Path(addr);

        $scope.currentInfo = info;

        if (info.key) {
          var lastGan = info.key.lastIndexOf("/");

          //if not endswith /
          if (lastGan != info.key.length - 1) {
            var fileKey = info.key;
            var fileName = info.key.substring(lastGan + 1);

            info.key = info.key.substring(0, lastGan + 1);
          }
        }

        //has bucket , list objects
        if (info.bucket) {
          $scope.currentBucket = info.bucket;

          if (!$rootScope.bucketMap[info.bucket]) {
            Toast.error("Forbidden");

            clearFilesList();
            return;
          }

          $scope.ref.isBucketList = false;
          info.region = $rootScope.bucketMap[info.bucket].region;

          //search
          if (fileName) {
            $scope.sch.objectName = fileName;
            searchObjectName();
          } else {
            //fix ubuntu
            $timeout(function () {
              listFiles();
            }, 100);
          }
        } else {
          //list buckets
          $scope.currentBucket = null;

          $scope.ref.isBucketList = true;

          //只有从来没有 list buckets 过，才list，减少http请求开销
          if (!$scope.buckets && forceRefresh) {
            listBuckets();
          }

          clearFilesList();
        }
      });
    }

    function listBuckets(fn) {
      $scope.isLoading = true;

      osClient.listAllBuckets().then(function (buckets) {
        $scope.isLoading = false;

        $scope.buckets = buckets;

        var m = {};
        angular.forEach(buckets, function (n) {
          m[n.name] = n;
        });
        $rootScope.bucketMap = m;

        safeApply($scope);

        if (fn) fn();

      }, function (err) {
        console.log(`list buckets error: ${err.message}`);
        $scope.isLoading = false;

        clearFilesList();

        $scope.buckets = [];
        $rootScope.bucketMap = {};

        safeApply($scope);

        if (fn) fn();
      });
    }

    function listFiles(info, marker, fn) {
      clearFilesList();

      $scope.isLoading = true;

      info = info || $scope.currentInfo;

      tryListFiles(info, marker, function (err) {
        if (err) {
          Toast.error(JSON.stringify(err));
        }

        if ($scope.nextObjectsMarker) {
          $timeout(() => {
            tryLoadMore();
          }, 100);
        } else {
          $scope.isLoading = false;
          safeApply($scope);
        }
      });
    }

    function tryListFiles(info, marker, fn) {
      osClient.listFiles(info.region, info.bucket, info.key, marker || "").then(function (result) {
        var data = result.data;

        // if (settingsSvs.showImageSnapshot.get() == 1) {
        //   signImagePreviewURL(info, data);
        // }

        //try to resolve bucket perm
        var authInfo = AuthInfo.get();
        $scope.ref.bucketPerm = authInfo.perm[info.bucket];

        $scope.objects = $scope.objects.concat(data);
        $scope.nextObjectsMarker = result.marker || null;

        safeApply($scope);

        if (fn) fn(null);

      }, function (err) {
        console.log(`list files: s3://${info.bucket}/${info.key}?marker=${maker}, error: ${err.message}`);

        clearFilesList();

        if (fn) fn(err);
      });
    }

    function tryLoadMore() {
      if ($scope.nextObjectsMarker) {
        var info = $scope.currentInfo;

        console.log(`loading next s3://${info.bucket}/${info.key}?marker=${$scope.nextObjectsMarker}`);

        tryListFiles(info, $scope.nextObjectsMarker, function (err) {
          if (err) {
            Toast.error(JSON.stringify(err));
          }

          if ($scope.nextObjectsMarker) {
            $timeout(() => {
              tryLoadMore();
            }, 100);
          } else {
            $scope.isLoading = false;
            safeApply($scope);
          }
        });
      }
    }

    function clearFilesList() {
      initSelect();

      $scope.objects = [];
      $scope.nextObjectsMarker = null;
    }

    function signImagePreviewURL(info, result) {
      var authInfo = AuthInfo.get();

      angular.forEach(result, function (n) {
        if (!n.isFolder && fileSvs.getFileType(n).type == "picture") {
          n.pic_url = osClient.signaturePicUrl(
            info.region,
            info.bucket,
            n.path,
            3600,
            "image/resize,w_48"
          );
        }
      });
    }

    function showBucketMultipart(item) {
      $modal.open({
        templateUrl: "main/files/modals/bucket-multipart-modal.html",
        controller: "bucketMultipartModalCtrl",
        size: "lg",
        backdrop: "static",
        resolve: {
          bucketInfo: function () {
            return item;
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showAddBucket() {
      $modal.open({
        templateUrl: "main/files/modals/add-bucket-modal.html",
        controller: "addBucketModalCtrl",
        resolve: {
          item: function () {
            return null;
          },
          callback: function () {
            return function () {
              Toast.success(T("bucket.add.success"));

              $timeout(function () {
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
          item: function () {
            return item;
          },
          callback: function () {
            return function () {
              Toast.success(T("bucketACL.update.success"));

              $timeout(function () {
                listBuckets();
              }, 300);
            };
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showDeleteBucket(item) {
      var title = T("bucket.delete.title");
      var message = T("bucket.delete.message", {
        name: item.name,
        region: item.region
      });
      Dialog.confirm(
        title,
        message,
        function (b) {
          if (b) {
            osClient.deleteBucket(item.region, item.name).then(function () {
              Toast.success(T("bucket.delete.success")); //删除Bucket成功
              //删除Bucket不是实时的，等待1秒后刷新
              $timeout(function () {
                listBuckets();
              }, 1000);
            });
          }
        },
        1
      );
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
          items: function () {
            return items;
          },
          currentInfo: function () {
            return angular.copy($scope.currentInfo);
          },
          callback: function () {
            return function () {
              $timeout(function () {
                listFiles();
              }, 300);
            };
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showAddFolder() {
      $modal.open({
        templateUrl: "main/files/modals/add-folder-modal.html",
        controller: "addFolderModalCtrl",
        resolve: {
          currentInfo: function () {
            return angular.copy($scope.currentInfo);
          },
          callback: function () {
            return function () {
              Toast.success(T("folder.create.success"));

              $timeout(function () {
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

      var templateUrl = "main/files/modals/preview/others-modal.html";
      var controller = "othersModalCtrl";
      var backdrop = true;

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
          bucketInfo: function () {
            return angular.copy($scope.currentInfo);
          },
          objectInfo: function () {
            return item;
          },
          fileType: function () {
            return fileType;
          },
          showFn: function () {
            return {
              callback: function (reloadStorageStatus) {
                if (reloadStorageStatus) {
                  $timeout(function () {
                    osClient.loadStorageStatus(
                      $scope.currentInfo.region,
                      $scope.currentInfo.bucket, [item]
                    );
                  }, 300);
                }
              },
              preview: showPreview,
              download: function () {
                showDownload(item);
              },
              grant: function () {
                showGrant([item]);
              },
              move: function (isCopy) {
                showMove([item], isCopy);
              },
              remove: function () {
                showDeleteFiles([item]);
              },
              rename: function () {
                showRename(item);
              },
              address: function () {
                showAddress(item);
              },
              acl: function () {
                showACL(item);
              },
              httpHeaders: function () {
                showHttpHeaders(item);
              },
              crc: function () {
                showCRC(item);
              }
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
          item: function () {
            return angular.copy(item);
          },
          currentInfo: function () {
            return angular.copy($scope.currentInfo);
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showDownload(item) {
      var bucketInfo = angular.copy($scope.currentInfo);
      var fromInfo = angular.copy(item);

      fromInfo.region = bucketInfo.region;
      fromInfo.bucket = bucketInfo.bucket;

      Dialog.showDownloadDialog(function (folderPaths) {
        if (!folderPaths || folderPaths.length == 0) return;

        var to = folderPaths[0];
        to = to.replace(/(\/*$)/g, "");

        $scope.handlers.downloadFilesHandler([fromInfo], to);
      });
    }

    ////////////////////////
    function initSelect() {
      $scope.sel.all = false;
      $scope.sel.has = false;
      $scope.sel.x = {};
    }

    function selectAll() {
      var f = $scope.sel.all;
      $scope.sel.has = f ? $scope.objects : false;
      var len = $scope.objects.length;
      for (var i = 0; i < len; i++) {
        $scope.sel.x["i_" + i] = f;
      }
    }

    var lastSeleteIndex = -1;

    function selectChanged(e, index) {
      if (e && e.shiftKey) {
        var min = Math.min(lastSeleteIndex, index);
        var max = Math.max(lastSeleteIndex, index);
        for (var i = min; i <= max; i++) {
          $scope.sel.x["i_" + i] = true;
        }
      }

      var len = $scope.objects.length;
      var all = true;
      var has = false;
      for (var i = 0; i < len; i++) {
        if (!$scope.sel.x["i_" + i]) {
          all = false;
        } else {
          if (!has) has = [];
          has.push($scope.objects[i]);
        }
      }
      $scope.sel.all = all;
      $scope.sel.has = has;

      lastSeleteIndex = index;
    }

    function selectBucket(item) {
      if ($scope.bucket_sel.item == item) {
        $scope.bucket_sel.item = null;
      } else {
        $scope.bucket_sel.item = item;
      }
    }

    ////////////////////////////////
    var uploadDialog, downloadDialog;

    function showUploadDialog() {
      if (uploadDialog) return;
      uploadDialog = true;
      $timeout(function () {
        uploadDialog = false;
      }, 600);

      Dialog.showUploadDialog(function (filePaths) {
        if (!filePaths || filePaths.length == 0) return;
        $scope.handlers.uploadFilesHandler(filePaths, $scope.currentInfo);
      });
    }

    function showDownloadDialog() {
      if (downloadDialog) return;
      downloadDialog = true;
      $timeout(function () {
        downloadDialog = false;
      }, 600);

      Dialog.showDownloadDialog(function (folderPaths) {
        if (!folderPaths || folderPaths.length == 0 || !$scope.sel.has) return;

        var to = folderPaths[0];
        _downloadMulti(to);
      });
    }

    function _downloadMulti(to) {
      to = to.replace(/(\/*$)/g, "");

      var selectedFiles = angular.copy($scope.sel.has);
      angular.forEach(selectedFiles, function (n) {
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
      var files = e.originalEvent.dataTransfer.files;
      var filePaths = [];
      if (files) {
        angular.forEach(files, function (n) {
          filePaths.push(n.path);
        });
      }

      $scope.handlers.uploadFilesHandler(filePaths, $scope.currentInfo);
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    function showGrant(items) {
      $modal.open({
        templateUrl: "main/files/modals/grant-modal.html",
        controller: "grantModalCtrl",
        resolve: {
          items: function () {
            return items;
          },
          currentInfo: function () {
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
          item: function () {
            return item;
          },
          currentInfo: function () {
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
          item: function () {
            return angular.copy(item);
          },
          moveTo: function () {
            return angular.copy($scope.currentInfo);
          },
          currentInfo: function () {
            return angular.copy($scope.currentInfo);
          },
          isCopy: function () {
            return false;
          },
          callback: function () {
            return function () {
              $timeout(function () {
                listFiles();
              }, 300);
            };
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showPaste() {
      var keyword = $scope.keepMoveOptions.isCopy ? T("copy") : T("move");

      if (
        $scope.keepMoveOptions.items.length == 1 &&
        $scope.currentInfo.bucket == $scope.keepMoveOptions.currentInfo.bucket
      ) {
        $modal.open({
          templateUrl: "main/files/modals/rename-modal.html",
          controller: "renameModalCtrl",
          backdrop: "static",
          resolve: {
            item: function () {
              return angular.copy($scope.keepMoveOptions.items[0]);
            },
            moveTo: function () {
              return angular.copy($scope.currentInfo);
            },
            currentInfo: function () {
              return angular.copy($scope.keepMoveOptions.currentInfo);
            },
            isCopy: function () {
              return $scope.keepMoveOptions.isCopy;
            },
            callback: function () {
              return function () {
                $scope.keepMoveOptions = null;

                $timeout(function () {
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

      Dialog.confirm(keyword, msg, function (isMove) {
        if (isMove) {
          $modal.open({
            templateUrl: "main/files/modals/move-modal.html",
            controller: "moveModalCtrl",
            backdrop: "static",
            resolve: {
              items: function () {
                return angular.copy($scope.keepMoveOptions.items);
              },
              moveTo: function () {
                return angular.copy($scope.currentInfo);
              },
              isCopy: function () {
                return $scope.keepMoveOptions.isCopy;
              },
              renamePath: function () {
                return "";
              },
              fromInfo: function () {
                return angular.copy($scope.keepMoveOptions.currentInfo);
              },
              callback: function () {
                return function () {
                  $scope.keepMoveOptions = null;
                  $timeout(function () {
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
      $scope.keepMoveOptions = null;
      safeApply($scope);
    }

    function showMove(items, isCopy) {
      $scope.keepMoveOptions = {
        items: items,
        isCopy: isCopy,
        currentInfo: angular.copy($scope.currentInfo),
        originPath: getCurrentS3path()
      };
    }

    function showAddress(item) {
      $modal.open({
        templateUrl: "main/files/modals/get-address.html",
        controller: "getAddressModalCtrl",
        resolve: {
          item: function () {
            return angular.copy(item);
          },
          currentInfo: function () {
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
          item: function () {
            return angular.copy(item);
          },
          currentInfo: function () {
            return angular.copy($scope.currentInfo);
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showHttpHeaders(item) {
      $modal.open({
        templateUrl: "main/files/modals/update-http-headers-modal.html",
        controller: "updateHttpHeadersModalCtrl",
        resolve: {
          item: function () {
            return angular.copy(item);
          },
          currentInfo: function () {
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
          item: function () {
            return angular.copy(item);
          },
          currentInfo: function () {
            return angular.copy($scope.currentInfo);
          },
          callback: function () {
            return function () {
              $timeout(function () {
                osClient.loadStorageStatus(
                  $scope.currentInfo.region,
                  $scope.currentInfo.bucket, [item]
                );
              }, 300);
            };
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showUserList() {
      $modal.open({
        templateUrl: "main/modals/users.html",
        controller: "usersCtrl",
        size: "lg",
        backdrop: "static"
      }).result.then(angular.noop, angular.noop);
    }
  }
]);