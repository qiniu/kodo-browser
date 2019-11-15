const Qiniu = require("qiniu");
const each = require("array-each");

angular.module("web").factory("KodoClient", [
  "$q",
  "Config",
  "AuthInfo",
  function ($q, Config, AuthInfo) {
    return {
      getBucketIdNameMapper: getBucketIdNameMapper
    };

    function getBucketIdNameMapper() {
      const df = $q.defer();

      getBucketManager().listBuckets((err, body) => {
        if (err) {
          df.reject(err);
        } else if (body && body.error) {
          df.reject({message: body.error});
        } else {
          let m = {};
          each(body, (bucket) => {
            m[bucket.id] = bucket.tbl;
          })
          df.resolve(m);
        }
      });

      return df.promise;
    }

    function getBucketManager() {
      const authInfo = AuthInfo.get();
      const mac = new Qiniu.auth.digest.Mac(authInfo.id, authInfo.secret);
      const ucUrl = Config.load(AuthInfo.usePublicCloud()).ucUrl;
      return {
        listBuckets: (callbackFunc) => {
          const requestURI = `${ucUrl}/v2/buckets`;
          const digest = Qiniu.util.generateAccessToken(mac, requestURI, null);
          Qiniu.rpc.postWithoutForm(requestURI, digest, callbackFunc)
        }
      };
    }
  }
]);
