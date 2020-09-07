angular.module("web").factory("Domains", [
  "$q",
  "$timeout",
  "$translate",
  "AuthInfo",
  "s3Client",
  "KodoClient",
  function(
    $q,
    $timeout,
    $translate,
    AuthInfo,
    s3Client,
    KodoClient
    ) {
    const each = require('array-each'),
          T = $translate.instant;

    class S3Domain {
      constructor(region, bucket) {
        this.region = region;
        this.bucket = bucket;
      }

      default() {
        return true;
      }

      name() {
        return T('no.owned.domain');
      }

      signatureUrl(key, expires) {
        expires = expires || this.maxLifetime();
        return s3Client.signatureUrl(this.region, this.bucket, key, expires);
      }

      deadlineRequired() {
        return true;
      }

      maxLifetime() {
        return 24 * 60 * 60 * 7;
      }
    }

    class KodoDomain {
      constructor(domain, protocol, isPrivate) {
        this.domain = domain;
        this.protocol = protocol;
        this.isPrivate = isPrivate;
      }

      default() {
        return false;
      }

      name() {
        return this.domain;
      }

      signatureUrl(key, expires) {
        const df = $q.defer();
        const protocol = this.protocol,
              domain = this.domain,
              isPrivate = this.isPrivate;
        expires = expires || this.maxLifetime();

        $timeout(() => {
          const url = KodoClient.getBucketManager().
                                 signatureUrl(protocol, domain, key, isPrivate, expires);
          df.resolve(url);
        });

        return df.promise;
      }

      deadlineRequired() {
        return this.isPrivate;
      }

      maxLifetime() {
        return 24 * 60 * 60 * 365;
      }
    }

    return {
      s3: s3,
      list: list
    };

    function s3(region, bucket) {
      return new S3Domain(region, bucket);
    }

    function list(region, bucket) {
      const df = $q.defer();
      const domains = [new S3Domain(region, bucket)];

      if (AuthInfo.usePublicCloud()) {
        KodoClient.getDomainsManager().listDomains(bucket).then((domainInfos) => {
          KodoClient.isBucketPrivate(bucket).then((isPrivate) => {
            each(domainInfos, (domainInfo) => {
              switch(domainInfo.type) {
              case 'normal':
              case 'pan':
              case 'test':
                domains.push(new KodoDomain(domainInfo.name, domainInfo.protocol, isPrivate));
                break;
              }
            });
          }, (err) => {
            df.reject(err);
          });
          df.resolve(domains);
        }, (err) => {
          df.reject(err);
        });
      } else {
        $timeout(() => { df.resolve(domains); });
      }

      return df.promise;
    }
  }
]);
