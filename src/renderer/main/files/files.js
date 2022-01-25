import angular from 'angular'
import deepEqual from 'fast-deep-equal'
import { Base64 } from 'js-base64'
import { S3_MODE } from 'kodo-s3-adapter-sdk'
import path from 'path'
import qiniuPath from 'qiniu-path'

import webModule from '@/app-module/web'

// import common controllers
import './_'

// import dependent controllers
import './transfer/frame'

// import factories
import safeApply from '@/components/services/safe-apply'
import * as Auth from '@/components/services/auth'
import * as AuthInfo from '@/components/services/authinfo'
import * as AuditLog from '@/components/services/audit-log'
import NgQiniuClient from '@/components/services/ng-qiniu-client'
import Settings from '@/components/services/settings'
import ExternalPath from '@/components/services/external-path'
import { getFileType } from '@/components/services/file.s'
import {
  fetchFromRemote as fetchRegionsStorageClasses,
  getAvailable as getAvailableStorageClasses,
} from '@/components/services/qiniu-client'

import { TOAST_FACTORY_NAME as Toast } from '@/components/directives/toast-list'
import { DIALOG_FACTORY_NAME as Dialog } from '@/components/services/dialog.s'
import { disable as customizeDisable } from "@/customize"
import Domains from '@/components/services/domains'

// import filters
import {
  TIME_FORMAT_FILTER_NAME,
  SIZE_FORMAT_FILTER_NAME,
  FILE_ICON_FILTER_NAME,
  HTML_ESCAPE_FILTER_NAME,
  I18N_FILTER_NAME,
} from '@/components/filters/formater'

// item operation modal
import {
  addBucketModalHtmlMapping,
  addExternalPathModalHtmlMapping,
  addFolderModalHtmlMapping,
  deleteFilesModalHtmlMapping,
  moveModalHtmlMapping,
  renameModalHtmlMapping,
  restoreFilesModalHtmlMapping,
  restoreModalHtmlMapping,
  showDownloadLinkModalHtmlMapping,
  showDownloadLinksModalHtmlMapping,
  updateStorageClassesModalHtmlMapping,
  updateStorageClassModalHtmlMapping,
  uploadConfirmModalHtmlMapping,
} from "@template-mappings/main/files/modals"
import addBucketModalCtrl from './modals/add-bucket-modal'
import addExternalPathModalCtrl from './modals/add-external-path-modal'
import addFolderModalCtrl from './modals/add-folder-modal'
import renameModalCtrl from './modals/rename-modal'
import moveModalCtrl from './modals/move-modal'
import showDownloadLinkModalCtrl from './modals/show-download-link-modal'
import showDownloadLinksModalCtrl from './modals/show-download-links-modal'
import updateStorageClassModalCtrl from './modals/update-storage-class-modal'
import updateStorageClassesModalCtrl from './modals/update-storage-classes-modal'
import restoreModalCtrl from './modals/restore-modal'
import restoreFilesModalCtrl from './modals/restore-files-modal'
import deleteFilesModalCtrl from './modals/delete-files-modal'
import uploadConfirmModalCtrl from './modals/upload-confirm-modal'
// preview modal
import {
  othersModalHtmlMapping as previewOthersModalHtmlMapping,
  codeModalHtmlMapping as previewCodeModalHtmlMapping,
  pictureModalHtmlMapping as previewPictureModalHtmlMapping,
  mediaModalHtmlMapping as previewMediaModalHtmlMapping,
} from '@template-mappings/main/files/modals/preview'
import previewOthersModalCtrl from './modals/preview/others-modal'
import previewCodeModalCtrl from './modals/preview/code-modal'
import previewPictureModalCtrl from './modals/preview/picture-modal'
import previewMediaModalCtrl from './modals/preview/media-modal'

import './file.css'

const FILES_CONTROLLER_NAME = 'filesCtrl'

webModule.controller(FILES_CONTROLLER_NAME, [
  "$rootScope",
  "$scope",
  "$filter",
  "$uibModal",
  "$timeout",
  "$translate",
  "$location",
  safeApply,
  NgQiniuClient,
  ExternalPath,
  Toast,
  Dialog,
  Domains,
  function (
    $rootScope,
    $scope,
    $filter,
    $modal,
    $timeout,
    $translate,
    $location,
    safeApply,
    QiniuClient,
    ExternalPath,
    Toast,
    Dialog,
    Domains,
  ) {
    const T = $translate.instant;

    angular.extend($scope, {
      showTab: 1,

      // supported mode: localBuckets, localFiles, externalPaths, externalFiles
      ref: {
        mode: 'localFiles',
        isListView: true
      },

      currentListView: true,
      keepMoveOptions: null,

      transVisible: localStorage.getItem("transVisible") == "true",
      toggleTransVisible: function (visible) {
        localStorage.setItem("transVisible", visible);

        $timeout(() => {
          $scope.transVisible = visible;
        });
      },

      // Read OEM Customization config to disable features
      disabledFeatures: customizeDisable,

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
      selectFileAndStopEventPropagation: selectFileAndStopEventPropagation,
      openFileAndStopEventPropagation: openFileAndStopEventPropagation,
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
      showRestoreFiles: showRestoreFiles,
      showRestoreFilesSelected: showRestoreFilesSelected,
      showSetStorageClassOfFiles: showSetStorageClassOfFiles,
      showSetStorageClassOfFilesSelected: showSetStorageClassOfFilesSelected,

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
      showPaste: showPaste,
      disablePaste: disablePaste,
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
      const KODO_ADDR_PROTOCOL = 'kodo://';
      let kodoAddress = KODO_ADDR_PROTOCOL;

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
      return Settings.stepByStepLoadingFiles === 1;
    }

    /////////////////////////////////

    function showDomains() {
      return AuthInfo.usePublicCloud() && $scope.ref.mode.startsWith('local');
    }

    function refreshDomains() {
      const info = $scope.currentInfo;
      Domains.list(info.regionId, info.bucketName, info.bucketGrantedPermission).
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
                      found = true;
                    }
                  });
                }
                if (!found) {
                    $scope.selectedDomain.domain = domains[0];
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
          listFiles(info, true);
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
        Auth.logout();
        $location.url("/login");
        return;
      }

      $rootScope.currentUser = user;
      $scope.ref.mode = 'localBuckets';

      fetchRegionsStorageClasses({
        id: user.id,
        secret: user.secret,
        isPublicCloud: user.isPublicCloud,
      })
        .then(() => {
          $timeout(() => {
            addEvents();
            $scope.$broadcast("filesViewReady");
          });
        });
    }

    function addEvents() {
      const KODO_ADDR_PROTOCOL = 'kodo://',
            onKodoAddressChange = (addr) => {
        let fileName;

        const info = QiniuClient.parseKodoPath(addr);
        info.qiniuBackendMode = QiniuClient.clientBackendMode();
        $scope.currentInfo = info;
        if (!info.bucketName) {
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

        if (info.bucketName) {
          // list objects
          const bucketInfo = $rootScope.bucketsMap[info.bucketName];
          if (bucketInfo) {
            if (!bucketInfo.regionId) {
              Toast.error("Forbidden");
              clearFilesList();
              return;
            }
            $scope.currentInfo.regionId = bucketInfo.regionId;
            $scope.ref.mode = 'localFiles';
            info.bucketName = bucketInfo.name;
            info.bucketId = bucketInfo.id;
            if (bucketInfo.grantedPermission) {
              info.bucketGrantedPermission = bucketInfo.grantedPermission;
            }
          } else {
            const regionId = ExternalPath.getRegionByBucketSync(info.bucketName);
            if (regionId) {
              $scope.currentInfo.regionId = regionId;
              $scope.ref.mode = 'externalFiles';
              info.qiniuBackendMode = S3_MODE;
              // TODO: Add bucket id here
            } else {
              Toast.error("Forbidden");
              clearFilesList();
              return;
            }
          }

          $scope.currentInfo.availableStorageClasses = getAvailableStorageClasses(
              $scope.currentInfo.regionId,
              $scope.currentInfo.qiniuBackendMode,
          );

          if (info.bucketName !== $scope.selectedDomain.bucketName) {
            $scope.domains = [Domains.s3(info.regionId, info.bucketName)];
            $scope.selectedDomain.bucketName = info.bucketName;
            $scope.selectedDomain.domain = $scope.domains[0];
          }

          $scope.currentBucketId = info.bucketId;
          $scope.currentBucketName = info.bucketName;

          // try to resolve bucket perm
          const user = $rootScope.currentUser;

          if (showDomains()) {
            refreshDomains();
          }
          // search
          if (fileName) {
            $scope.sch.objectName = fileName;

            searchObjectName();
          } else {
            $timeout(listFiles, 100);
          }
        } else {
          // list buckets
          delete $scope.currentBucketId;
          delete $scope.currentBucketName;

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
        if ($rootScope.bucketsMap) {
          onKodoAddressChange(addr);
        } else {
          $scope.isLoading = true;

          QiniuClient.listAllBuckets(getQiniuClientOpt()).then((bucketList) => {
            $rootScope.bucketsMap = {};
            if (bucketList) {
              bucketList.forEach((bucket) => {
                $rootScope.bucketsMap[bucket.name] = bucket;
              });
            }
            onKodoAddressChange(addr);
          }).finally(() => {
            $scope.isLoading = false;
            safeApply($scope);
          });
        }
      });
    }

    function listBuckets(fn) {
      clearFilesList();
      $scope.isLoading = true;

      QiniuClient.listAllBuckets(getQiniuClientOpt()).then((bucketList) => {
        $rootScope.bucketsMap = {};
        if (bucketList) {
          bucketList.forEach((bucket) => {
            $rootScope.bucketsMap[bucket.name] = bucket;
          });
        }

        const buckets = [];
        for (const bucketName in $rootScope.bucketsMap) {
          if ($scope.sch.bucketName && bucketName.indexOf($scope.sch.bucketName) < 0) {
            continue;
          }
          buckets.push($rootScope.bucketsMap[bucketName]);
        }
        $scope.buckets = buckets;
        showBucketsTable(buckets);
        if (fn) fn(null);
      }).catch((err) => {
        if (fn) fn(err);
      }).finally(() => {
        $scope.isLoading = false;
        safeApply($scope);
      });
    }

    function listFiles(info, keepObjectSearchName) {
      clearFilesList();
      if (!keepObjectSearchName) {
        $scope.sch.objectName = '';
      }
      $scope.isLoading = true;

      info = info || angular.copy($scope.currentInfo);

      tryListFiles(info, null, (err, files) => {
        $scope.isLoading = false;

        if (info.bucketName !== $scope.currentInfo.bucketName ||
            info.key !== $scope.currentInfo.key + $scope.sch.objectName) {
          return;
        }

        if (err) {
          Toast.error(err.message);
          return;
        }

        showFilesTable(files);
      });
    }

    function tryListFiles(info, marker, fn) {
      if (!info || !info.bucketName) {
        return;
      }

      const filesLoadingSize = Settings.filesLoadingSize;
      QiniuClient.listFiles(
        info.regionId, info.bucketName, info.key, marker || undefined,
        angular.extend(getQiniuClientOpt(), { maxKeys: filesLoadingSize, minKeys: filesLoadingSize, storageClasses: $scope.currentInfo.availableStorageClasses }),
      ).then((result) => {
        $timeout(() => {
          if (info.bucketName !== $scope.currentInfo.bucketName ||
              info.key !== $scope.currentInfo.key + $scope.sch.objectName) {
            return;
          }

          const nextObjectsMarker = result.marker || null;
          $scope.nextObjectsMarker = nextObjectsMarker;
          $scope.nextObjectsMarkerInfo = info;

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
      }).catch((err) => {
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
          Toast.error(err.message);
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
          externalPaths = externalPaths.filter((ep) => ep.shortPath.indexOf($scope.sch.externalPathName) >= 0);
        }

        $timeout(() => {
          $scope.externalPaths = externalPaths;
          $scope.isLoading = false;
          showExternalPathsTable(externalPaths);
          if (fn) fn(null);
        });
      }).catch((err) => {
        console.error("list external paths error", err);
        $timeout(() => {
          $scope.isLoading = false;
          if (fn) fn(err);
        });
      });
    }

    function isFrozenOrNot(region, bucket, key, callbacks) {
      QiniuClient.getFrozenInfo(region, bucket, key, getQiniuClientOpt()).then((data) => {
        const callback = callbacks[data.status.toLowerCase()];
        if (callback) {
          callback();
        }
      }).catch((err) => {
        const callback = callbacks.error;
        if (callback) {
          callback(err);
        }
      });
    }

    /////////////////////////////////
    function showAddBucket() {
      $modal.open({
        templateUrl: addBucketModalHtmlMapping.path,
        controller: addBucketModalCtrl,
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
          qiniuClientOpt: () => {
            return getQiniuClientOpt();
          },
          regions: () => {
            return QiniuClient.getRegions(getQiniuClientOpt());
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showAddExternalPath() {
      $modal.open({
        templateUrl: addExternalPathModalHtmlMapping.path,
        controller: addExternalPathModalCtrl,
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
            return QiniuClient.getRegions(getQiniuClientOpt());
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showDeleteBucket(item) {
      if (item.grantedPermission) {
        Toast.error(T('permission.denied'));
        return;
      }

      const title = T("bucket.delete.title"),
          message = T("bucket.delete.message", {
            name: item.name,
            region: item.regionId,
          });

      Dialog.confirm(title, message,
        (btn) => {
          if (btn) {
            QiniuClient.deleteBucket(item.regionId, item.name, getQiniuClientOpt()).then(() => {
              AuditLog.log(
                AuditLog.Action.DeleteBucket,
                {
                  regionId: item.regionId,
                  name: item.name,
                },
              );
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

              AuditLog.log(
                AuditLog.Action.DeleteExternalPath,
                {
                  regionId: item.regionId,
                  fullPath: item.fullPath
                },
              );
              $timeout(listExternalPaths, 1000);
            });
          }
        },
        1
      );
    }

    function showAddFolder() {
      if ($scope.currentInfo.bucketGrantedPermission === 'readonly') {
        Toast.error(T('permission.denied'));
        return;
      }

      $modal.open({
        templateUrl: addFolderModalHtmlMapping.path,
        controller: addFolderModalCtrl,
        resolve: {
          currentInfo: () => {
            return angular.copy($scope.currentInfo);
          },
          qiniuClientOpt: () => {
            return getQiniuClientOpt();
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
      if (!$scope.domains || $scope.domains.length === 0) {
        Toast.error(T('permission.denied'));
        return;
      }

      var fileType = getFileType(item);
      fileType.type = type || fileType.type;

      var template = previewOthersModalHtmlMapping.path,
        controller = previewOthersModalCtrl,
        backdrop = true;

      if (fileType.type === "code") {
        template = previewCodeModalHtmlMapping.path;
        controller = previewCodeModalCtrl;
        backdrop = "static";
      } else if (fileType.type === "picture") {
        template = previewPictureModalHtmlMapping.path;
        controller = previewPictureModalCtrl;
      } else if (fileType.type === "video" || fileType.type === "audio") {
        template = previewMediaModalHtmlMapping.path;
        controller = previewMediaModalCtrl;
      }
      // else if(fileType.type=='doc'){
      //   templateUrl= 'main/files/modals/preview/doc-modal.html';
      //   controller= 'docModalCtrl';
      // }

      $modal.open({
        templateUrl: template,
        controller: controller,
        size: "lg",
        //backdrop: backdrop,
        resolve: {
          currentInfo: () => {
            return angular.copy($scope.currentInfo);
          },
          bucketInfo: () => {
            return angular.copy($scope.currentInfo);
          },
          objectInfo: () => {
            return item;
          },
          qiniuClientOpt: () => {
            return getQiniuClientOpt();
          },
          fileType: () => {
            return fileType;
          },
          selectedDomain: () => {
            return $scope.selectedDomain;
          },
          reload: () => {
            return () => {
              $timeout(listFiles, 300);
            };
          },
          showFn: () => {
            return {
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
              updateStorageClass: () => {
                showUpdateStorageClass(item);
              }
            };
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showRename(item) {
      if ($scope.currentInfo.bucketGrantedPermission === 'readonly') {
        Toast.error(T('permission.denied'));
        return;
      }

      $modal.open({
        templateUrl: renameModalHtmlMapping.path,
        controller: renameModalCtrl,
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
          qiniuClientOpt: () => {
            return getQiniuClientOpt();
          },
          isCopy: () => {
            return false;
          },
          callback: () => {
            return () => {
              $timeout(listFiles, 100);
            };
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function disablePaste() {
      return $scope.currentInfo.bucketGrantedPermission === 'readonly' ||
             $scope.keepMoveOptions.currentInfo.regionId !== $scope.currentInfo.regionId ||
             $scope.keepMoveOptions.currentInfo.qiniuBackendMode !== $scope.currentInfo.qiniuBackendMode;
    }

    function showPaste() {
      var keyword = $scope.keepMoveOptions.isCopy ? T('copy') : T('move');

      if ($scope.keepMoveOptions.items.length == 1 &&
          deepEqual($scope.currentInfo, $scope.keepMoveOptions.currentInfo)) {
        $modal.open({
          templateUrl: renameModalHtmlMapping.path,
          controller: renameModalCtrl,
          backdrop: 'static',
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
            qiniuClientOpt: () => {
              return getQiniuClientOpt();
            },
            callback: () => {
              return () => {
                $scope.keepMoveOptions = null;
                $timeout(listFiles, 100);
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
            templateUrl: moveModalHtmlMapping.path,
            controller: moveModalCtrl,
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
              qiniuClientOpt: () => {
                return getQiniuClientOpt();
              },
              callback: () => {
                return () => {
                  $scope.keepMoveOptions = null;
                  $timeout(listFiles, 100);
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
      if ($scope.currentInfo.bucketGrantedPermission === 'readonly') {
        Toast.error(T('permission.denied'));
        return;
      }

      $scope.keepMoveOptions = {
        items: items,
        isCopy: isCopy,
        currentInfo: angular.copy($scope.currentInfo),
        originPath: getCurrentPath()
      };
    }

    function showDownloadLink(item) {
      if (!$scope.domains || $scope.domains.length === 0) {
        Toast.error(T('permission.denied'));
        return;
      }

      $modal.open({
        templateUrl: showDownloadLinkModalHtmlMapping.path,
        controller: showDownloadLinkModalCtrl,
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
          qiniuClientOpt: () => {
            return getQiniuClientOpt();
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
      if (!$scope.domains || $scope.domains.length === 0) {
        Toast.error(T('permission.denied'));
        return;
      }

      $modal.open({
        templateUrl: showDownloadLinksModalHtmlMapping.path,
        controller: showDownloadLinksModalCtrl,
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
          qiniuClientOpt: () => {
            return getQiniuClientOpt();
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

    function showUpdateStorageClass(item) {
      $modal.open({
        templateUrl: updateStorageClassModalHtmlMapping.path,
        controller: updateStorageClassModalCtrl,
        resolve: {
          item: () => {
            return angular.copy(item);
          },
          currentInfo: () => {
            return angular.copy($scope.currentInfo);
          },
          qiniuClientOpt: () => {
            return getQiniuClientOpt();
          },
          callback: () => {
            return () => {
              $timeout(listFiles, 100);
            };
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showRestore(item) {
      $modal.open({
        templateUrl: restoreModalHtmlMapping.path,
        controller: restoreModalCtrl,
        resolve: {
          item: () => {
            return angular.copy(item);
          },
          currentInfo: () => {
            return angular.copy($scope.currentInfo);
          },
          qiniuClientOpt: () => {
            return getQiniuClientOpt();
          },
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showDownload(item) {
      if (!$scope.domains || $scope.domains.length === 0) {
        Toast.error(T('permission.denied'));
        return;
      }

      const bucketInfo = angular.copy($scope.currentInfo),
            fromInfo = angular.copy(item),
            domain = angular.copy($scope.selectedDomain.domain);

      fromInfo.region = bucketInfo.regionId;
      fromInfo.bucket = bucketInfo.bucketName;
      fromInfo.domain = domain;
      fromInfo.qiniuBackendMode = bucketInfo.qiniuBackendMode;
      Dialog.showDownloadDialog((folderPaths) => {
        if (!folderPaths || folderPaths.length == 0) {
          return;
        }
        if (!folderPaths[0].endsWith(path.sep)) {
          folderPaths[0] += path.sep;
        }
        const to = qiniuPath.fromLocalPath(folderPaths[0]);
        $scope.handlers.downloadFilesHandler([fromInfo], to);
      });
    }

    function showDeleteFilesSelected() {
      showDeleteFiles($scope.sel.has);
    }

    function showDeleteFiles(items) {
      if ($scope.currentInfo.bucketGrantedPermission === 'readonly') {
        Toast.error(T('permission.denied'));
        return;
      }

      $modal.open({
        templateUrl: deleteFilesModalHtmlMapping.path,
        controller: deleteFilesModalCtrl,
        backdrop: "static",
        resolve: {
          items: () => {
            return items;
          },
          currentInfo: () => {
            return angular.copy($scope.currentInfo);
          },
          qiniuClientOpt: () => {
            return getQiniuClientOpt();
          },
          callback: () => {
            return () => {
              $timeout(listFiles, 300);
            };
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showRestoreFilesSelected() {
      showRestoreFiles($scope.sel.has);
    }

    function showRestoreFiles(items) {
      if ($scope.currentInfo.bucketGrantedPermission === 'readonly') {
        Toast.error(T('permission.denied'));
        return;
      }

      $modal.open({
        templateUrl: restoreFilesModalHtmlMapping.path,
        controller: restoreFilesModalCtrl,
        backdrop: "static",
        resolve: {
          items: () => {
            return items;
          },
          currentInfo: () => {
            return angular.copy($scope.currentInfo);
          },
          qiniuClientOpt: () => {
            return getQiniuClientOpt();
          },
          callback: () => {
            return () => {
              $timeout(listFiles, 300);
            };
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    function showSetStorageClassOfFilesSelected() {
      showSetStorageClassOfFiles($scope.sel.has);
    }

    function showSetStorageClassOfFiles(items) {
      if ($scope.currentInfo.bucketGrantedPermission === 'readonly') {
        Toast.error(T('permission.denied'));
        return;
      }

      $modal.open({
        templateUrl: updateStorageClassesModalHtmlMapping.path,
        controller: updateStorageClassesModalCtrl,
        backdrop: "static",
        resolve: {
          items: () => {
            return items;
          },
          currentInfo: () => {
            return angular.copy($scope.currentInfo);
          },
          qiniuClientOpt: () => {
            return getQiniuClientOpt();
          },
          callback: () => {
            return () => {
              $timeout(listFiles, 300);
            };
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    /**
    * @param filePaths { string }
    */
    function showUploadConfirmModal(filePaths) {
      $modal.open({
        templateUrl: uploadConfirmModalHtmlMapping.path,
        controller: uploadConfirmModalCtrl,
        resolve: {
          items: () => {
            return filePaths;
          },
          currentInfo: () => {
            return angular.copy($scope.currentInfo);
          },
          qiniuClientOpt: () => {
            return getQiniuClientOpt();
          },
          okCallback: () => {
            return ({ files, uploadOptions }) => {
              $scope.handlers.uploadFilesHandler(
                files.map(qiniuPath.fromLocalPath),
                angular.copy($scope.currentInfo),
                uploadOptions,
              );
            }
          }
        }
      }).result.then(angular.noop, angular.noop);
    }

    ////////////////////////
    function selectBucket(item) {
      if ($scope.bucket_sel === item) {
        $timeout(() => {
          $scope.bucket_sel = null;
        });
      } else {
        $timeout(() => {
          $scope.bucket_sel = item;
        });
      }
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

    function selectFileAndStopEventPropagation(item, event) {
      selectFile(item);
      event.stopPropagation();
    }

    function openFileAndStopEventPropagation(item, event) {
      if (item.itemType === 'folder') {
        gotoAddress($scope.currentBucketName, item.path)
      } else {
        if ($scope.domains && $scope.domains.length > 0) {
          showPreview(item);
        }
        event.stopPropagation();
      }
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

      if ($scope.currentInfo.bucketGrantedPermission === 'readonly') {
        Toast.error(T('permission.denied'));
        return;
      }

      uploadDialog = true;
      $timeout(() => {
        uploadDialog = false;
      }, 600);

      Dialog.showUploadDialog((filePaths) => {
        if (!filePaths || filePaths.length == 0) {
          return;
        }

        showUploadConfirmModal(filePaths)
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
      if (!to.endsWith(path.sep)) {
        to += path.sep;
      }
      const localPath = qiniuPath.fromLocalPath(to);

      const selectedFiles = angular.copy($scope.sel.has);
      angular.forEach(selectedFiles, (n) => {
        n.region = $scope.currentInfo.regionId;
        n.bucket = $scope.currentInfo.bucketName;
        n.domain = angular.copy($scope.selectedDomain.domain);
        n.qiniuBackendMode = $scope.currentInfo.qiniuBackendMode;
      });
      /**
       * @param fromS3Path {array}  item={region, bucket, path, name, size }
       * @param toLocalPath {string}
       */
      $scope.handlers.downloadFilesHandler(selectedFiles, localPath);
    }

    /**
     * 监听 drop
     * @param e
     * @returns {boolean}
     */
    function handlerDrop(e) {
      e.preventDefault();
      e.stopPropagation();

      const files = e.originalEvent.dataTransfer.files;

      if (files.length) {
        showUploadConfirmModal(Array.prototype.map.call(
          files,
          f => f.path
        ))
      }

      return false;
    }

    function showBucketsTable(buckets) {
      initBucketSelect();

      QiniuClient.getRegions(getQiniuClientOpt()).then((regions) => {
        var $list = $('#bucket-list').bootstrapTable({
          columns: [{
            field: '_',
            title: '-',
            radio: true
          }, {
            field: 'name',
            title: T('bucket.name'),
            formatter: (val, row, idx, field) => {
              if (row.grantedPermission === 'readonly') {
                return `<i class="text-warning"><img src="icons/buckets/zhidu.png" style="display: inline-block; height: 15px;" /></i>&nbsp;<a href=""><span class="bucket-name bucket-readonly">${val}</span></a>`;
              } else if (row.grantedPermission === 'readwrite') {
                return `<i class="text-warning"><img src="icons/buckets/duxie.png" style="display: inline-block; height: 15px;" /></i>&nbsp;<a href=""><span class="bucket-name bucket-readwrite">${val}</span></a>`;
              } else {
                return `<i class="fa fa-database text-warning"></i>&nbsp;<a href=""><span class="bucket-name">${val}</span></a>`;
              }
            },
            events: {
              'click a': (evt, val, row, idx) => {
                gotoAddress(val);

                return false;
              }
            }
          }, {
            field: 'regionId',
            title: T('bucket.region'),
            formatter: (id) => {
              if (!id) {
                return T('region.get.error');
              }
              let regionLabel = undefined;
              const region = regions.find((region) => region.s3Id === id && region.translatedLabel);
              if (region) {
                regionLabel = region.translatedLabel;
              }
              return regionLabel || T('region.unknown');
            }
          }, {
            field: 'createDate',
            title: T('creationTime'),
            formatter: (val) => {
              return $filter(TIME_FORMAT_FILTER_NAME)(val);
            }
          }],
          clickToSelect: true,
          onCheck: (row, $row) => {
            if (row === $scope.bucket_sel) {
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
        const readonlyBucketElements = $('#bucket-list tbody tr .bucket-name.bucket-readonly')
        if (readonlyBucketElements.length > 0) {
          angular.forEach(readonlyBucketElements, (row) => {
            $(row).tooltip('destroy');
            $(row).tooltip({ delay: 0, title: T('privilege.readonly'), trigger: 'hover' });
          });
        }
        const readwriteBucketElements = $('#bucket-list tbody tr .bucket-name.bucket-readwrite')
        if (readwriteBucketElements.length > 0) {
          angular.forEach(readwriteBucketElements, (row) => {
            $(row).tooltip('destroy');
            $(row).tooltip({ delay: 0, title: T('privilege.readwrite'), trigger: 'hover' });
          });
        }
      }).catch((err) => {
        console.error(err);
        Toast.error(err);
      })
    }

    function showExternalPathsTable(externalPaths) {
      initExternalPathSelect();

      QiniuClient.getRegions(getQiniuClientOpt()).then((regions) => {
        var $list = $('#external-path-list').bootstrapTable({
          columns: [{
            field: '_',
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
              let regionLabel = undefined;
              const region = regions.find((region) => region.s3Id === id && region.translatedLabel);
              if (region) {
                regionLabel = region.translatedLabel;
              }
              return regionLabel || T('region.unknown');
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
      }).catch((err) => {
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
          field: '_',
          title: '-',
          checkbox: true
        }, {
          field: 'name',
          title: T('name'),
          formatter: (val, row, idx, field) => {
            let htmlAttributes = '';
            if (row.storageClass) {
              const currentInfo = $scope.currentInfo;
              htmlAttributes = `data-storage-class="${row.storageClass.toLowerCase()}" data-key="${Base64.encode(row.path.toString())}" data-region="${currentInfo.regionId}" data-bucket="${currentInfo.bucketName}"`;
            }
            return `
              <div class="text-overflow file-item-name" style="cursor:pointer; ${row.itemType === 'folder' ? 'color:orange' : ''}" ${htmlAttributes}>
                <i class="fa fa-${$filter(FILE_ICON_FILTER_NAME)(row)}"></i>
                <a href="" style="width: 700px; display: inline-block;"><span>${$filter(HTML_ESCAPE_FILTER_NAME)(val)}</span></a>
              </div>
            `;
          },
          events: {
            'click a,i': (evt, val, row, idx) => {
              if (row.itemType === 'folder') {
                $timeout(() => {
                  $scope.total_folders = 0;
                });

                gotoAddress($scope.currentBucketName, row.path);
              }

              return false;
            },
            'dblclick a,i': (evt, val, row, idx) => {
              if (row.itemType === 'folder') {
                $timeout(() => {
                  $scope.total_folders = 0;
                });

                gotoAddress($scope.currentBucketName, row.path);
              } else if ($scope.domains && $scope.domains.length > 0) {
                showPreview(row);
              }

              return false;
            }
          }
        }, {
          field: 'size',
          title: `${T('type')} / ${T('size')}`,
          formatter: (val, row, idx, field) => {
            if (row.itemType === 'folder') {
              return `<span class="text-muted">${T('folder')}</span>`;
            }

            return $filter(SIZE_FORMAT_FILTER_NAME)(val);
          }
        }, {
          field: 'storageClass',
          title: T('storageClassesType'),
          visible: $scope.currentInfo.availableStorageClasses.length > 0,
          formatter: (val, row, idx, field) => {
            if (row.itemType === 'folder') {
              return `<span class="text-muted">${T('folder')}</span>`;
            } else if (row.storageClass) {
              const storageClass = $scope.currentInfo.availableStorageClasses
                .find(item => item.kodoName === row.storageClass)
              if (!storageClass) {
                return T(`storageClassesType.unknown`);
              }
              return $filter(I18N_FILTER_NAME)(storageClass.nameI18n) || row.storageClass;
            } else {
              return '-';
            }
          }
        }, {
          field: 'lastModified',
          title: T('lastModifyTime'),
          formatter: (val, row, idx, field) => {
            if (row.itemType === 'folder') {
              return '-';
            }

            return $filter(TIME_FORMAT_FILTER_NAME)(val);
          }
        }, {
          field: 'actions',
          title: T('actions'),
          formatter: (val, row, idx, field) => {
            var acts = ['<div class="btn-group btn-group-xs">'];
            if (row.itemType !== 'folder' && row.storageClass && row.storageClass.toLowerCase() === 'glacier' && $scope.currentInfo.bucketGrantedPermission !== 'readonly') {
              acts.push(`<button type="button" class="btn unfreeze text-warning" data-toggle="tooltip" data-toggle-i18n="restore"><span class="fa fa-fire"></span></button>`);
            }
            if ($scope.domains && $scope.domains.length > 0) {
              if (row.itemType !== 'folder' || row.path.directoryBasename() && row.path.directoryBasename().length > 0) {
                acts.push(`<button type="button" class="btn download" data-toggle="tooltip" data-toggle-i18n="download"><span class="fa fa-download"></span></button>`);
              }
              if (row.itemType !== 'folder') {
                acts.push(`<button type="button" class="btn download-link" data-toggle="tooltip" data-toggle-i18n="getDownloadLink"><span class="fa fa-link"></span></button>`);
              }
            }
            if (row.itemType !== 'folder' && $scope.currentInfo.availableStorageClasses.length > 0) {
              acts.push(`<button type="button" class="btn updateStorageClass text-warning" data-toggle="tooltip" data-toggle-i18n="updateStorageClass"><span class="iconfont icon-a-726-8-02"></span></button>`);
            }
            if ($scope.currentInfo.bucketGrantedPermission !== 'readonly') {
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
            'click button.updateStorageClass': (evt, val, row, idx) => {
              const region = $scope.currentInfo.regionId,
                    bucket = $scope.currentInfo.bucketName,
                    key = row.path.toString();
              isFrozenOrNot(region, bucket, key, {
                'normal': () => {
                  showUpdateStorageClass(row);
                },
                'unfrozen': () => {
                  showUpdateStorageClass(row);
                },
                'unfreezing': () => {
                  Dialog.alert(T('updateStorageClass.title'), T('updateStorageClassModal.message.unfreezing'));
                },
                'frozen': () => {
                  Dialog.alert(T('updateStorageClass.title'), T('updateStorageClassModal.message.frozen'));
                },
                'error': (err) => {
                  Dialog.alert(T('updateStorageClass.title'), T('updateStorageClassModal.message.head_error'));
                },
              });
              return false;
            },
            'click button.unfreeze': (evt, val, row, idx) => {
              const region = $scope.currentInfo.regionId,
                    bucket = $scope.currentInfo.bucketName,
                    key = row.path.toString();
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
          const ONE_HOUR = 60 * 60 * 1000;
          if (row.lastModified && ((new Date()) - row.lastModified) <= 4*ONE_HOUR) {
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
      const fileRowElements = $('#file-list tbody tr [data-storage-class="glacier"]')
      if (fileRowElements.length > 0) {
        angular.forEach(fileRowElements, (row) => {
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
      }
      const i18nButtonElements = $('#file-list tbody tr .btn-group button[type="button"][data-toggle="tooltip"][data-toggle-i18n]')
      if (i18nButtonElements.length > 0) {
        angular.forEach(i18nButtonElements, (button) => {
          let mouseOverEventSetup = false;
          $(button).tooltip('destroy');
          $(button).off('mouseover').on('mouseover', () => {
            if (!mouseOverEventSetup) {
              mouseOverEventSetup = true;
              $(button).attr('data-placement', 'top');
              const i18nKey = $(button).attr('data-toggle-i18n');
              $(button).tooltip({ container: 'body', title: T(i18nKey), trigger: 'hover' });
              $(button).tooltip('show');
            }
          });
        });
      }
      $timeout(() => {
        $scope.total_folders = $list.find('i.fa-folder').length;
      });
    }

    function getQiniuClientOpt() {
      if ($scope.ref.mode.startsWith('external')) {
        return { preferS3Adapter: true };
      } else {
        return {};
      }
    }
  }
]);

export default FILES_CONTROLLER_NAME
