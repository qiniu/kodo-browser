angular.module('web')
  .controller('othersModalCtrl', ['$scope','$uibModalInstance','$uibModal','bucketInfo','objectInfo','fileType','showFn','safeApply',
    function ($scope, $modalInstance,$modal, bucketInfo, objectInfo, fileType, showFn, safeApply) {

      angular.extend($scope, {
        bucketInfo: bucketInfo,
        objectInfo: objectInfo,
        fileType: fileType,
        afterRestoreSubmit:afterRestoreSubmit,
        afterCheckSuccess:afterCheckSuccess,

        previewBarVisible: false,
        showFn: showFn,
        cancel: cancel,

        showAs: showAs,
        //showDownload: showDownload,

        showAsCodeBtn: shouldShowAsCodeBtn()
      });
      function afterRestoreSubmit(){
        showFn.callback(true);
      }
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
    }])
;
