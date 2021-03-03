angular.module("web").factory("Auth", [
  "$q",
  "$location",
  "$translate",
  "QiniuClient",
  "AuthInfo",
  function ($q, $location, $translate, QiniuClient, AuthInfo) {
    const T = $translate.instant;

    return {
      login: login,
      logout: logout
    };

    function login(data) {
      return new Promise((resolve, reject) => {
        QiniuClient.listAllBuckets(data).then(() => {
          data.isAuthed = true;
          AuthInfo.save(data);
          resolve();
        }).catch((err) => {
          data.isAuthed = false;
          reject(err);
        });
      });
    }

    function logout() {
      return new Promise((resolve) => {
        QiniuClient.clearAllCache();
        const { ipcRenderer } = require('electron');
        AuthInfo.remove();
        ipcRenderer.send('asynchronous', { key: 'clearCache' });
        ipcRenderer.send('asynchronous-job', { key: 'job-stopall' });
        resolve();
      });
    }
  }
]);
