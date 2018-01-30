angular.module('web')
  .factory('Auth', ['$q', '$location', '$translate', 'osClient', 'AuthInfo', 'Const', 'Cipher',
    function ($q, $location, $translate, osClient, AuthInfo, Const, Cipher) {
      var T = $translate.instant;

      return {
        login: login,
        logout: logout
      };

      function login(data) {
        if (!data.osspath) delete data.region;

        var df = $q.defer();
        data.httpOptions = { timeout: 5000 };

        if (data.osspath) {

          var info = osClient.parseOSSPath(data.osspath);
          data.bucket = info.bucket;

          osClient.getClient(data).listObjects({ Bucket: info.bucket, Prefix: info.key, Marker: '', MaxKeys: 1 }, function (err, result) {
            if (err) {
              df.reject(err);
            }
            else if (result.RequestId && result.CommonPrefixes) {
              //登录成功
              AuthInfo.save(data);
              df.resolve();
            }
            else {
              df.reject({ code: 'Error', message: T('login.endpoint.error') }); //'请确定Endpoint是否正确'
            }
          });

        } else {
          osClient.getClient(data).listBuckets(function (err, result) {

            if (err) {
              //失败
              df.reject({ code: err.code, message: err.message });
            }
            else if (result.Buckets) {
              //登录成功
              AuthInfo.save(data);
              df.resolve();
            } else {
              df.reject({ code: 'Error', message: T('login.endpoint.error') });
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
