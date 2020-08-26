angular.module('web')
  .controller('showDownloadLinkModalCtrl', ['$scope', '$q','$translate', '$uibModalInstance', 'item', 'current', 'domains', 'Toast', 'Domains',
    function ($scope, $q, $translate, $modalInstance, item, current, domains, Toast, Domains) {
      const { clipboard } = require('electron'),
                     each = require('array-each'),
                        T = $translate.instant;

      initCurrentDomain(domains);

      angular.extend($scope, {
        item: item,
        current: current,
        domains: domains,
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
          each(domains, (domain) => {
            if (current.domain.name() === domain.name()) {
              current.domain = domain;
              found = true;
            }
          });
        }
        if (!found) {
          each(domains, (domain) => {
            if (domain.default()) {
              current.domain = domain;
            }
          });
        }
      }

      function onSubmit(form1){
        if(!form1.$valid) return;

        $scope.current.domain.signatureUrl(item.path, $scope.info.sec).then((url) => {
          $scope.info.url = url;
        });
      }

      function copyDownloadLink() {
        clipboard.writeText($scope.info.url);
        Toast.success(T("copy.successfully")); //'复制成功'
      }

      function refreshDomains() {
        const info = $scope.current.info;
        Domains.list(info.region, info.bucket).
                then((domains) => {
                  $scope.domains = domains;
                  initCurrentDomain(domains);
                }, (err) => {
                  console.error(err);
                  Toast.error(err);
                });
      }
    }
  ]);
