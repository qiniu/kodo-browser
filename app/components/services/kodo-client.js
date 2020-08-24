const Qiniu = require("qiniu"),
      each = require("array-each"),
      urllib = require("urllib");

angular.module("web").factory("KodoClient", [
  "$translate",
  "$timeout",
  "$q",
  "Config",
  "AuthInfo",
  function ($translate, $timeout, $q, Config, AuthInfo) {
    const T = $translate.instant;

    // TODO: 改用接口查询，不要写死
    const AWSRegionID2KodoRegionID = {
      'cn-east-1': 'z0',
      'cn-north-1': 'z1',
      'cn-south-1': 'z2',
      'us-north-1': 'na0',
      'ap-southeast-1': 'as0',
    };

    return {
      getBucketIdNameMapper: getBucketIdNameMapper,
      getRegionNames: getRegionNames,
      getRegions: getRegions,
      isQueryRegionAPIAvaiable: isQueryRegionAPIAvaiable,
      queryForAWSDomain: queryForAWSDomain,
    };

    function getBucketIdNameMapper() {
      const df = $q.defer();

      getBucketManager().listBuckets((err, body) => {
        if (err) {
          df.reject(err);
        } else if (body && body.error) {
          df.reject({message: body.error});
        } else {
          const m = {};
          each(body, (bucket) => {
            m[bucket.id] = bucket.tbl;
          });
          df.resolve(m);
        }
      });

      return df.promise;
    }

    function getRegionNames() {
      const df = $q.defer();

      getBucketManager().listRegions((err, body) => {
        if (err) {
          df.reject(err);
        } else {
          const m = {};
          each(body.regions, (region) => {
            m[region.id] = region.description;
          });
          df.resolve(m);
        }
      });

      return df.promise;
    }

    function getRegions(loadDefault) {
      const df = $q.defer();

      const regions = angular.copy(Config.load(loadDefault).regions);
      if (loadDefault) {
        each(regions, (region) => {
          if (!region.label) {
            region.label = T(region.id);
          }
        });
        $timeout(() => { df.resolve(regions); });
      } else {
        getRegionNames().then((regionNames) => {
          each(regions, (region) => {
            if (!region.label) {
              region.label = regionNames[AWSRegionID2KodoRegionID[region.id]];
            }
          });
          df.resolve(regions);
        }, (err) => {
          df.reject(err);
        });
      }

      return df.promise;
    }

    function isQueryRegionAPIAvaiable() {
      const df = $q.defer();
      const ucUrl = Config.load(AuthInfo.usePublicCloud()).ucUrl;
      urllib.request(`${ucUrl}/v4/query`, {}, (err, _, resp) => {
        if (err) {
          df.reject(err);
        } else if (resp.status === 404) {
          df.resolve(false);
        } else {
          df.resolve(true);
        }
      });
      return df.promise;
    }

    function queryForAWSDomain(bucketName) {
      const df = $q.defer();
      const authInfo = AuthInfo.get();
      const mac = new Qiniu.auth.digest.Mac(authInfo.id, authInfo.secret);
      const ucUrl = Config.load(AuthInfo.usePublicCloud()).ucUrl;

      urllib.request(`${ucUrl}/v4/query`, {
        data: { ak: authInfo.id, bucket: bucketName },
        dataAsQueryString: true,
        dataType: 'json'
      }, (err, data) => {
        if (err) {
          df.reject(err);
        } else {
          const s3Info = data.hosts[0].s3;
          df.resolve({ region: s3Info.region_alias, domain: s3Info.domains[0] });
        }
      });
      return df.promise;
    }

    function getBucketManager() {
      const authInfo = AuthInfo.get();
      const mac = new Qiniu.auth.digest.Mac(authInfo.id, authInfo.secret);
      const ucUrl = Config.load(AuthInfo.usePublicCloud()).ucUrl;
      return {
        listRegions: (callbackFunc) => {
          const requestURI = `${ucUrl}/regions`;
          const digest = Qiniu.util.generateAccessToken(mac, requestURI, null);
          Qiniu.rpc.postWithoutForm(requestURI, digest, callbackFunc)
        },
        listBuckets: (callbackFunc) => {
          const requestURI = `${ucUrl}/v2/buckets`;
          const digest = Qiniu.util.generateAccessToken(mac, requestURI, null);
          Qiniu.rpc.postWithoutForm(requestURI, digest, callbackFunc)
        }
      };
    }
  }
]);
