angular.module("web").factory("Domains", [
  "$q",
  "$timeout",
  "$translate",
  "AuthInfo",
  "QiniuClient",
  function(
    $q,
    $timeout,
    $translate,
    AuthInfo,
    QiniuClient,
    ) {
    const T = $translate.instant,
          { KODO_MODE, S3_MODE } = require('kodo-s3-adapter-sdk');

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

      toQiniuDomain() {
        return undefined;
      }

      qiniuBackendMode() {
        return S3_MODE;
      }

      signatureUrl(key, expires, opt) {
        expires = expires || this.maxLifetime();
        const newOpt = Object.assign({}, opt, { preferS3Adapter: true });
        return QiniuClient.signatureUrl(this.region, this.bucket, key, undefined, expires, newOpt);
      }

      getContent(key, opt) {
        const newOpt = Object.assign({}, opt, { preferS3Adapter: true });
        return QiniuClient.getContent(this.region, this.bucket, key, this.toQiniuDomain(), newOpt);
      }

      saveContent(key, content, opt) {
        const newOpt = Object.assign({}, opt, { preferS3Adapter: true });
        return QiniuClient.saveContent(this.region, this.bucket, key, content, this.toQiniuDomain(), newOpt);
      }

      deadlineRequired() {
        return true;
      }

      maxLifetime() {
        return 24 * 60 * 60 * 7;
      }
    }

    class KodoDomain {
      constructor(region, bucket, domain) {
        this.region = region;
        this.bucket = bucket;
        this.domain = domain;
      }

      default() {
        return false;
      }

      name() {
        return this.domain.name;
      }

      toQiniuDomain() {
        return this.domain;
      }

      qiniuBackendMode() {
        return KODO_MODE;
      }

      signatureUrl(key, expires, opt) {
        expires = expires || this.maxLifetime();
        const newOpt = Object.assign({}, opt, { preferKodoAdapter: true });
        return QiniuClient.signatureUrl(this.region, this.bucket, key, this.domain, expires, newOpt);
      }

      getContent(key, opt) {
        const newOpt = Object.assign({}, opt, { preferKodoAdapter: true });
        return QiniuClient.getContent(this.region, this.bucket, key, this.toQiniuDomain(), newOpt);
      }

      saveContent(key, content, opt) {
        const newOpt = Object.assign({}, opt, { preferKodoAdapter: true });
        return QiniuClient.saveContent(this.region, this.bucket, key, content, this.toQiniuDomain(), newOpt);
      }

      deadlineRequired() {
        return this.domain.private;
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

    function list(region, bucket, grantedPermissions) {
      return new Promise((resolve, reject) => {
        let allDomains = [];

        if (!grantedPermissions) {
          allDomains.push(new S3Domain(region, bucket));
        }

        if (AuthInfo.usePublicCloud()) {
          QiniuClient.listDomains(region, bucket).then((domains) => {
            allDomains = allDomains.concat(domains.map((domain) => new KodoDomain(region, bucket, domain)));
            resolve(allDomains);
          }, () => {
            resolve(allDomains);
          });
        } else {
          resolve(allDomains);
        }
      });
    }
  }
]);
