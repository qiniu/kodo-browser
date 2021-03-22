angular.module('web')
  .controller('showDownloadLinkModalCtrl', ['$scope', '$q', '$translate', '$uibModalInstance', 'safeApply', 'item', 'current', 'domains', 'showDomains', 'Toast', 'Domains', 'qiniuClientOpt',
    function($scope, $q, $translate, $modalInstance, safeApply, item, current, domains, showDomains, Toast, Domains, qiniuClientOpt) {
      const { clipboard } = require('electron'),
                        T = $translate.instant;

      initCurrentDomain(domains);

      angular.extend($scope, {
        item: item,
        current: current,
        domains: domains,
        showDomains: showDomains,
        info: {
          sec: 600,
          url: null,
        },
        cancel: cancel,
        onSubmit: onSubmit,
        copyDownloadLink: copyDownloadLink,
        refreshDomains: refreshDomains,
      });

      function cancel() {
        $modalInstance.dismiss('close');
      }

      function initCurrentDomain(domains) {
        let found = false;
        if (current.domain !== null) {
          domains.forEach((domain) => {
            if (current.domain.name() === domain.name()) {
              current.domain = domain;
              found = true;
            }
          });
        }
        if (!found) {
          domains.forEach((domain) => {
            if (domain.default()) {
              current.domain = domain;
              found = true;
            }
          });
        }
        if (!found) {
          current.domain = domains[0];
        }
      }

      function onSubmit(form1){
        if(!form1.$valid) return;

        $scope.current.domain.signatureUrl(item.path, $scope.info.sec, qiniuClientOpt).then((url) => {
          $scope.info.url = url.toString();
          safeApply($scope);
        });
      }

      function copyDownloadLink() {
        clipboard.writeText($scope.info.url);
        Toast.success(T("copy.successfully")); //'复制成功'
      }

      function refreshDomains() {
        const info = $scope.current.info;
        Domains.list(info.regionId, info.bucketName, info.bucketGrantedPermission).
                then((domains) => {
                  $scope.domains = domains;
                  initCurrentDomain(domains);
                  safeApply($scope);
                });
      }
    }
  ]);
