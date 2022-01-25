import angular from 'angular'

import webModule from '@/app-module/web'

import safeApply from '@/components/services/safe-apply'

const OTHERS_MODAL_CONTROLLER_NAME = 'othersModalCtrl'

webModule
  .controller(OTHERS_MODAL_CONTROLLER_NAME, [
    '$scope',
    '$uibModalInstance',
    '$uibModal',
    'currentInfo',
    'bucketInfo',
    'objectInfo',
    'fileType',
    'qiniuClientOpt',
    'showFn',
    safeApply,
    function ($scope, $modalInstance, $modal, currentInfo, bucketInfo, objectInfo, fileType, qiniuClientOpt, showFn, safeApply) {

      angular.extend($scope, {
        currentInfo: currentInfo,
        bucketInfo: bucketInfo,
        objectInfo: objectInfo,
        fileType: fileType,
        qiniuClientOpt: qiniuClientOpt,
        afterCheckSuccess:afterCheckSuccess,

        previewBarVisible: false,
        showFn: showFn,
        cancel: cancel,

        showAs: showAs,
        //showDownload: showDownload,

        showAsCodeBtn: shouldShowAsCodeBtn()
      });

      function afterCheckSuccess() {
        $scope.previewBarVisible = true;
      }

      function shouldShowAsCodeBtn(){
        var name = objectInfo.name;

        if(name.endsWith('.tar.gz') || name.endsWith('.tar') || name.endsWith('.zip') || name.endsWith('.bz') || name.endsWith('.xz')
         || name.endsWith('.dmg') || name.endsWith('.pkg') || name.endsWith('.apk')
         || name.endsWith('.exe') || name.endsWith('.msi') || name.endsWith('.dll')|| name.endsWith('.chm')
         || name.endsWith('.iso') || name.endsWith('.img') || name.endsWith('.img')
         || name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx')) {
          return false;
        }
        return true;
      }

      function cancel() {
        $modalInstance.dismiss('close');
      }

      function showAs(type){
        showFn.preview(objectInfo, type);
        cancel();
      }
    }
  ]);

export default OTHERS_MODAL_CONTROLLER_NAME
