import angular from 'angular'

import webModule from '@/app-module/web'

import NgQiniuClient from '@/components/services/ng-qiniu-client'
import { bucketACL } from '@/const/setting-keys'
import { TOAST_FACTORY_NAME as Toast } from '@/components/directives/toast-list'
import * as AuditLog from '@/components/services/audit-log'

const ADD_BUCKET_MODAL_CONTROLLER_NAME = 'addBucketModalCtrl'

webModule
  .controller(ADD_BUCKET_MODAL_CONTROLLER_NAME, [
    '$scope',
    '$uibModalInstance',
    '$translate',
    'callback',
    NgQiniuClient,
    'qiniuClientOpt',
    Toast,
    'regions',
    function ($scope, $modalInstance, $translate, callback, QiniuClient, qiniuClientOpt, Toast, regions) {
      const T = $translate.instant
      const bucketACL = angular.copy(bucketACL)
      angular.extend($scope, {
        regions: regions.filter((region) => !region.cannotCreateBucket),
        bucketACL: [], //angular.copy(bucketACL),
        cancel: cancel,
        onSubmit: onSubmit,
        item: {
          acl: bucketACL[0].acl,
          region: regions[0].s3Id,
        },
        reg: /^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$/i,
        openURL: function (v) {
          openExternal(v)
        }
      });

      i18nBucketACL();

      function i18nBucketACL() {
        const acls = angular.copy(bucketACL);
        angular.forEach(acls, function (n) {
          n.label = T('aclType.' + n.acl);
        });
        $scope.bucketACL = acls;
      }

      function cancel() {
        $modalInstance.dismiss('cancel');
      }

      function onSubmit(form) {
        if (!form.$valid) return;

        var item = angular.copy($scope.item);
        QiniuClient.createBucket(item.region, item.name, qiniuClientOpt).then((result) => {
          AuditLog.log(
            AuditLog.Action.AddBucket,
            {
              regionId: item.region,
              name: item.name,
              acl: item.acl,
            },
          );
          callback();
          cancel();
        });
      }
    }
  ]);

export default ADD_BUCKET_MODAL_CONTROLLER_NAME
