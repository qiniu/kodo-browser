angular.module("web").factory("Auth", [
  "$q",
  "$location",
  "$translate",
  "s3Client",
  "AuthInfo",
  function ($q, $location, $translate, s3Client, AuthInfo) {
    const $http = require('request');
    const T = $translate.instant;

    return {
      login: login,
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

    function logout() {
      const { ipcRenderer } = require('electron');
      var df = $q.defer();
      AuthInfo.remove();
      ipcRenderer.send('asynchronous', { key: 'clearCache' });
      df.resolve();
      return df.promise;
    }
  }
]);
