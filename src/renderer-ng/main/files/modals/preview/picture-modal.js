import angular from 'angular'

import Duration from "@common/const/duration";

import webModule from '@/app-module/web'
import { SIZE_FORMAT_FILTER_NAME } from "@/components/filters/formater";

const PICTURE_MODAL_CONTROLLER_NAME = 'pictureModalCtrl'

webModule
  .controller(PICTURE_MODAL_CONTROLLER_NAME, ['$scope',
    '$uibModalInstance',
    '$timeout',
    '$uibModal',
    "$filter",
    'showFn',
    'selectedDomain',
    'currentInfo',
    'bucketInfo',
    'objectInfo',
    'qiniuClientOpt',
    'fileType',
    function ($scope, $modalInstance, $timeout, $modal, $filter, showFn, selectedDomain, currentInfo, bucketInfo, objectInfo, qiniuClientOpt, fileType) {
      const MAX_SIZE = 5 * 1024 * 1024 //5MB

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
        forceShowPicture: forceShowPicture,

        tooBigI18n: {
          value: $filter(SIZE_FORMAT_FILTER_NAME)(MAX_SIZE),
        },
        isShowPicture: objectInfo.size < MAX_SIZE,
      });

      function afterCheckSuccess() {
        $scope.previewBarVisible = true;
        if (objectInfo.size < MAX_SIZE) {
          getContent();
        }
      }

      function cancel() {
        $modalInstance.dismiss('close');
      }

      function getContent() {
        selectedDomain.domain.signatureUrl(objectInfo.path, 12 * Duration.Hour / Duration.Second, qiniuClientOpt).then((url) => {
          $timeout(() => {
            $scope.imgsrc = url.toString();
          });
        });
      }

      function forceShowPicture() {
        $scope.isShowPicture = true;
        getContent();
      }
    }
  ]);

export default PICTURE_MODAL_CONTROLLER_NAME
