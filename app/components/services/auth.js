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
      return QiniuClient.listAllBuckets(data).then(() => {
        data.isAuthed = true;
        AuthInfo.save(data);
      }, () => {
        data.isAuthed = false;
      });
    }

    function logout() {
      return new Promise((resolve) => {
        const { ipcRenderer } = require('electron');
        AuthInfo.remove();
        ipcRenderer.send('asynchronous', { key: 'clearCache' });
        resolve();
      });
    }
  }
]);
