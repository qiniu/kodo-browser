import webModule from '@/app-module/web'

import { TOAST_FACTORY_NAME as Toast } from '../directives/toast-list'

import * as QiniuClient from './qiniu-client';

const NG_QINIU_CLIENT_FACTORY_NAME = 'QiniuClient'

webModule.factory(NG_QINIU_CLIENT_FACTORY_NAME, [
  '$rootScope',
  '$translate',
  '$state',
  Toast,
  function ($rootScope, $translate, $state, Toast) {
    const T = $translate.instant;

    return {
      isQueryRegionAPIAvaiable: QiniuClient.isQueryRegionAPIAvailable,
      listAllBuckets: wrapHandleError(QiniuClient.listAllBuckets),
      createBucket: wrapHandleError(QiniuClient.createBucket),
      deleteBucket: wrapHandleError(QiniuClient.deleteBucket),

      listFiles: wrapHandleError(QiniuClient.listFiles),
      listDomains: wrapHandleError(QiniuClient.listDomains),
      createFolder: wrapHandleError(QiniuClient.createFolder),

      checkFileExists: wrapHandleError(QiniuClient.checkFileExists),
      checkFolderExists: wrapHandleError(QiniuClient.checkFolderExists),
      getFrozenInfo: wrapHandleError(QiniuClient.getFrozenInfo),
      headFile: wrapHandleError(QiniuClient.headFile),
      setStorageClass: wrapHandleError(QiniuClient.setStorageClass),
      setStorageClassOfFiles: setStorageClassOfFiles,
      stopSetStorageClassOfFiles: QiniuClient.stopSetStorageClassOfFiles,

      getContent: wrapHandleError(QiniuClient.getContent),
      saveContent: wrapHandleError(QiniuClient.saveContent),

      //重命名
      moveOrCopyFile: wrapHandleError(QiniuClient.moveOrCopyFile),

      //复制，移动
      moveOrCopyFiles: moveOrCopyFiles,
      stopMoveOrCopyFiles: QiniuClient.stopMoveOrCopyFiles,

      //解冻
      restoreFile: wrapHandleError(QiniuClient.restoreFile),
      restoreFiles: restoreFiles,
      stopRestoreFiles: QiniuClient.stopRestoreFiles,

      //删除
      deleteFiles: deleteFiles,
      stopDeleteFiles: QiniuClient.stopDeleteFiles,

      parseKodoPath: QiniuClient.parseKodoPath,
      signatureUrl: wrapHandleError(QiniuClient.signatureUrl),
      getRegions: getRegionsWithHandleError,
      clientBackendMode: QiniuClient.clientBackendMode,
      clearAllCache: QiniuClient.clearAllCache,
    };

    function handleError(err) {
      if (err.code === 'InvalidAccessKeyId') {
        $state.go('login');
      } else {
        if (!err.code) {
          if (err.message.indexOf('Failed to fetch') !== -1) {
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

    function wrapHandleError(asyncFn) {
      return async (...args) => {
        try {
          return await asyncFn(...args);
        }
        catch (err) {
          handleError(err);
          throw err;
        }
      }
    }

    function getRegionsWithHandleError(opt) {
      try {
        return QiniuClient.getRegions($rootScope.langSettings.lang, opt);
      }
      catch (err) {
        handleError(err);
        throw err;
      }
    }

    function setStorageClassOfFiles(region, bucket, items, storageClass, progressFn, opt) {
      return QiniuClient.setStorageClassOfFiles(
          region,
          bucket,
          items,
          storageClass,
          progressFn,
          handleError,
          opt,
      )
          .catch(err => {
            handleError(err);
            return Promise.reject(err);
          });
    }

    function moveOrCopyFiles(region, items, target, progressFn, isCopy, renamePrefix, opt) {
      return QiniuClient.moveOrCopyFiles(
          region,
          items,
          target,
          progressFn,
          handleError,
          isCopy,
          renamePrefix,
          opt,
      )
          .catch(err => {
            handleError(err);
            return Promise.reject(err);
          });
    }

    function restoreFiles(region, bucket, items, days, progressFn, opt) {
      return QiniuClient.restoreFiles(
          region,
          bucket,
          items,
          days,
          progressFn,
          handleError,
          opt,
      )
          .catch(err => {
            handleError(err);
            return Promise.reject(err);
          });
    }

    function deleteFiles(region, bucket, items, progressFn, opt) {
      return QiniuClient.deleteFiles(
          region,
          bucket,
          items,
          progressFn,
          handleError,
          opt,
      )
          .catch(err => {
            handleError(err);
            return Promise.reject(err);
          });
    }

  }
]);

export default NG_QINIU_CLIENT_FACTORY_NAME
