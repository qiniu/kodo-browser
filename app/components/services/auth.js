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
      const df = $q.defer();

      s3Client.getClient(data).then((client) => {
        client.listBuckets(function (err, result) {
          if (err) {
            console.error(err);
            df.reject({
              code: err.code,
              message: err.message
            });
          } else if (result.Buckets) {
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
      }, (err) => {
        console.error(err);
        df.reject({
          code: "Error",
          message: T("login.endpoint.error")
        });
      })

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
