import angular from 'angular'

import webModule from '@/app-module/web'

const DOC_MODAL_CONTROLLER_NAME = 'docModalCtrl'

webModule
  .controller(DOC_MODAL_CONTROLLER_NAME, ['$scope',
    '$uibModalInstance',
    'bucketInfo',
    'objectInfo',
    'fileType',
    function ($scope, $modalInstance, bucketInfo, objectInfo, fileType) {

      angular.extend($scope, {
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
