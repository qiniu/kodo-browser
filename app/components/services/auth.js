angular.module("web").factory("Auth", [
  "$q",
  "$location",
  "$translate",
  "osClient",
  "AuthInfo",
  function($q, $location, $translate, osClient, AuthInfo) {
    return {
      login: login,
      logout: logout
    };

    var T = $translate.instant;

    function login(data) {
      var df = $q.defer();

      data.httpOptions = { timeout: 5000 };

      if (data.s3path) {
        var info = osClient.parseS3Path(data.s3path);

        data.bucket = info.bucket;

        osClient
          .getClient(data)
          .listObjects(
            { Bucket: info.bucket, Prefix: info.key, Marker: "", MaxKeys: 1 },
            function(err, result) {
              if (err) {
                df.reject(err);
              } else if (result.RequestId && result.CommonPrefixes) {
                //login success
                data.isAuthed = true;

                AuthInfo.save(data);

                df.resolve();
              } else {
                df.reject({
                  code: "Error",
                  message: T("login.endpoint.error")
                });
              }
            }
          );
      } else {
        osClient.getClient(data).listBuckets(function(err, result) {
          if (err) {
            df.reject({ code: err.code, message: err.message });
          } else if (result.Buckets) {
            //login success
            data.isAuthed = true;

            AuthInfo.save(data);

            df.resolve();
          } else {
            df.reject({ code: "Error", message: T("login.endpoint.error") });
          }
        });
      }

      return df.promise;
    }

    function logout() {
      var df = $q.defer();
      AuthInfo.remove();
      df.resolve();
      return df.promise;
    }
  }
]);
