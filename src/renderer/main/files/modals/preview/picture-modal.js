import angular from 'angular'

import webModule from '@/app-module/web'

const PICTURE_MODAL_CONTROLLER_NAME = 'pictureModalCtrl'

webModule
  .controller(PICTURE_MODAL_CONTROLLER_NAME, ['$scope',
    '$uibModalInstance',
    '$timeout',
    '$uibModal',
    'showFn',
    'selectedDomain',
    'currentInfo',
    'bucketInfo',
    'objectInfo',
    'qiniuClientOpt',
    'fileType',
    function ($scope, $modalInstance, $timeout, $modal, showFn, selectedDomain, currentInfo, bucketInfo, objectInfo, qiniuClientOpt, fileType) {

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
        if (objectInfo.size < $scope.MAX_SIZE) {
          getContent();
        }
      }

      function cancel() {
        $modalInstance.dismiss('close');
      }

      function getContent() {
        selectedDomain.domain.signatureUrl(objectInfo.path, qiniuClientOpt).then((url) => {
          $timeout(() => {
            $scope.imgsrc = url.toString();
          });
        });
      }
    }
  ]);

export default PICTURE_MODAL_CONTROLLER_NAME
