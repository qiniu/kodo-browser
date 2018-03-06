angular.module("web").factory("settingsSvs", [
  function () {
    return {
      isDebug: {
        get: function () {
          return parseInt(localStorage.getItem("isDebug") || 0);
        },
        set: function (v) {
          return localStorage.setItem("isDebug", v);
        }
      },

      useElectronNode: {
        get: function () {
          return parseInt(localStorage.getItem("useElectronNode") || 0);
        },
        set: function (v) {
          return localStorage.setItem("useElectronNode", v);
        }
      },

      autoUpgrade: {
        get: function () {
          return parseInt(localStorage.getItem("autoUpgrade") || 0);
        },
        set: function (v) {
          return localStorage.setItem("autoUpgrade", v);
        }
      },

      resumeUpload: {
        get: function () {
          return parseInt(localStorage.getItem("resumeUpload") || 0);
        },
        set: function (v) {
          return localStorage.setItem("resumeUpload", v);
        }
      },

      maxUploadConcurrency: {
        get: function () {
          return parseInt(localStorage.getItem("maxUploadConcurrency") || 10);
        },
        set: function (v) {
          return localStorage.setItem("maxUploadConcurrency", v);
        }
      },

      multipartUploadSize: {
        get: function () {
          return parseInt(localStorage.getItem("multipartUploadSize") || 8);
        },
        set: function (v) {
          if (parseInt(v)%4 != 0) {
            return;
          }

          return localStorage.setItem("multipartUploadSize", v);
        }
      },

      multipartUploadThreshold: {
        get: function () {
          return parseInt(localStorage.getItem("multipartUploadThreshold") || 100);
        },
        set: function (v) {
          return localStorage.setItem("multipartUploadThreshold", v);
        }
      },

      resumeDownload: {
        get: function () {
          return parseInt(localStorage.getItem("resumeDownload") || 0);
        },
        set: function (v) {
          return localStorage.setItem("resumeDownload", v);
        }
      },

      maxDownloadConcurrency: {
        get: function () {
          return parseInt(localStorage.getItem("maxDownloadConcurrency") || 10);
        },
        set: function (v) {
          return localStorage.setItem("maxDownloadConcurrency", v);
        }
      },

      multipartDownloadSize: {
        get: function () {
          return parseInt(localStorage.getItem("multipartDownloadSize") || 8);
        },
        set: function (v) {
          return localStorage.setItem("multipartDownloadSize", v);
        }
      },

      multipartDownloadThreshold: {
        get: function () {
          return parseInt(localStorage.getItem("multipartDownloadThreshold") || 100);
        },
        set: function (v) {
          return localStorage.setItem("multipartDownloadThreshold", v);
        }
      },

      historiesLength: {
        get: function () {
          return parseInt(localStorage.getItem("multipartDownloadThreshold") || 100);
        },
        set: function (v) {
          return localStorage.setItem("multipartDownloadThreshold", v);
        }
      }
    };
  }
]);
