angular.module("web").factory("Domains", [
  "$q",
  "$timeout",
  "$translate",
  "s3Client",
  "KodoClient",
  function(
    $q,
    $timeout,
    $translate,
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
      list: list
    };

    function list(region, bucket) {
      const df = $q.defer();
      const domains = [new S3Domain(region, bucket)];

      KodoClient.getDomainsManager().listDomains(bucket).then((domainInfos) => {
        each(domainInfos, (domainInfo) => {
          switch(domainInfo.type) {
          case 'normal':
          case 'pan':
          case 'test':
            domains.push(new KodoDomain(domainInfo.name, domainInfo.protocol, domainInfo.qiniuPrivate));
            break;
          }
        });
        df.resolve(domains);
      }, (err) => {
        df.reject(err);
      });
      return df.promise;
    }
  }
]);
