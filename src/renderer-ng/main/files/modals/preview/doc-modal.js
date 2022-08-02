import angular from 'angular'

import webModule from '@/app-module/web'

const DOC_MODAL_CONTROLLER_NAME = 'docModalCtrl'

webModule
  .controller(DOC_MODAL_CONTROLLER_NAME, ['$scope',
    '$uibModalInstance',
    'currentInfo',
    'bucketInfo',
    'objectInfo',
    'fileType',
    function ($scope, $modalInstance, currentInfo, bucketInfo, objectInfo, fileType) {

      angular.extend($scope, {
        currentInfo: currentInfo,
        bucketInfo: bucketInfo,
        objectInfo: objectInfo,
        fileType: fileType,

        cancel: cancel
      });

      function cancel() {
        $modalInstance.dismiss('close');
      }
    }
  ]);

export default DOC_MODAL_CONTROLLER_NAME
