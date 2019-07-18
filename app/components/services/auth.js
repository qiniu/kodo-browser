angular.module("web").factory("Auth", [
  "$q",
  "$location",
  "$translate",
  "s3Client",
  "AuthInfo",
  function ($q, $location, $translate, s3Client, AuthInfo) {
    var $http = require('request');
    var T = $translate.instant;

    return {
      login: login,
      loginPass: loginPass,
      logout: logout
    };

    function login(data) {
      var df = $q.defer();
      var client = s3Client.getClient(data);

      data.httpOptions = {
        timeout: 5000
      };

      if (data.s3path) {
        var urlinfo = s3Client.parseKodoPath(data.s3path);

        data.bucket = urlinfo.bucket;

        s3client.listObjects({
          Bucket: urlinfo.bucket,
          Prefix: urlinfo.key,
          Marker: "",
          MaxKeys: 1
        }, function (err, result) {
          if (err) {
            df.reject(err);
          } else if (result.RequestId && result.CommonPrefixes) {
            //login success
            data.region = client.config.region;
            data.isAuthed = true;
            data.isSuper = true;
            data.perm = {
              read: true,
              write: true,
              copy: true,
              move: true,
              rename: true,
              remove: true
            };

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
        client.listBuckets(function (err, result) {
          if (err) {
            df.reject({
              code: err.code,
              message: err.message
            });
          } else if (result.Buckets) {
            //login success
            data.region = client.config.region;
            data.isAuthed = true;
            data.isSuper = true;
            data.perm = {
              read: true,
              write: true,
              copy: true,
              move: true,
              rename: true,
              remove: true
            };

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

      var endpoint = data.logintpl;
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
