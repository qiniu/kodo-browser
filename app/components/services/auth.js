angular.module("web").factory("Auth", [
  "$q",
  "$location",
  "$translate",
  "osClient",
  "AuthInfo",
  function ($q, $location, $translate, osClient, AuthInfo) {
    var $http = require('request');
    var T = $translate.instant;


    return {
      login: login,
      loginPass: loginPass,
      logout: logout
    };

    function login(data) {
      var df = $q.defer();

      data.httpOptions = {
        timeout: 5000
      };

      if (data.s3path) {
        var info = osClient.parseS3Path(data.s3path);

        data.bucket = info.bucket;

        osClient.getClient(data).listObjects({
          Bucket: info.bucket,
          Prefix: info.key,
          Marker: "",
          MaxKeys: 1
        }, function (err, result) {
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
        });
      } else {
        osClient.getClient(data).listBuckets(function (err, result) {
          if (err) {
            df.reject({
              code: err.code,
              message: err.message
            });
          } else if (result.Buckets) {
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
        });
      }

      return df.promise;
    }

    function loginPass(data) {
      var df = $q.defer();

      data.httpOptions = {
        timeout: 5000
      };

      var endpoint = data.ecloudtpl;
      if (endpoint[endpoint.length - 1] === "/") {
        endpoint += "api/session";
      } else {
        endpoint += "/api/session";
      }

      $http.post({
        url: endpoint,
        json: {
          username: data.username,
          password: data.password,
          aksk: true
        }
      }, function (err, response, body) {
        if (err) {
          df.reject(err);
        } else {
          delete data.password;

          if (body.code == "NoSuchAccount" || body.code == "AmbiguousGrantByPassword") {
            df.reject("用户名或者密码错误");
            return;
          }
          data.isAuthed = true;
          data.isSuper = body.isSuper;
          data.id = body.access_key_id;
          data.secret = body.access_key_secret;
          data.token = body.token;
          data.perm = body.bucket_perm;

          AuthInfo.save(data);

          df.resolve();
        }
      });

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