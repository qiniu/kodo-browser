import angular from 'angular'

import webModule from '@/app-module/web'

const MEDIA_MODAL_CONTROLLER_NAME = 'mediaModalCtrl'

webModule
  .controller(MEDIA_MODAL_CONTROLLER_NAME, [
    '$scope',
    '$uibModalInstance',
    '$timeout',
    '$sce',
    '$uibModal',
    'selectedDomain',
    'showFn',
    'currentInfo',
    'bucketInfo',
    'objectInfo',
    'fileType',
    'qiniuClientOpt',
    function ($scope, $modalInstance, $timeout, $sce, $modal, selectedDomain, showFn, currentInfo, bucketInfo, objectInfo, fileType, qiniuClientOpt) {

      angular.extend($scope, {
        currentInfo: currentInfo,
        bucketInfo: bucketInfo,
        objectInfo: objectInfo,
        fileType: fileType,
        qiniuClientOpt: qiniuClientOpt,
        afterCheckSuccess: afterCheckSuccess,

        previewBarVisible: false,
        showFn: showFn,
        cancel: cancel,

        MAX_SIZE: 5 * 1024 * 1024 //5MB
      });

      function afterCheckSuccess() {
        $scope.previewBarVisible = true;
        genURL();
      }

      function cancel() {
        $modalInstance.dismiss('close');
      }

      function genURL() {
        selectedDomain.domain.signatureUrl(objectInfo.path, qiniuClientOpt).then((url) => {
          $scope.src_origin = url.toString();
          $scope.src = $sce.trustAsResourceUrl(url.toString());

          $timeout(() => {
            const ele = $('#video-player');
            if(parseInt(ele.css('height')) > parseInt(ele.css('width'))){
               ele.css('height', $(document).height()-240);
               ele.css('width', 'auto');
            }
          }, 1000);
        });
      }
    }
  ]);

export default MEDIA_MODAL_CONTROLLER_NAME
