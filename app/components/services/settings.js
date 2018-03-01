angular.module("web").factory("settingsSvs", [
  function () {
    return {
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

      resumeUploadThreshold: {
        get: function () {
          return parseInt(localStorage.getItem("resumeUploadThreshold") || 100);
        },
        set: function (v) {
          return localStorage.setItem("resumeUploadThreshold", v);
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

      resumeDownloadThreshold: {
        get: function () {
          return parseInt(localStorage.getItem("resumeDownloadThreshold") || 100);
        },
        set: function (v) {
          return localStorage.setItem("resumeDownloadThreshold", v);
        }
      },

      maxUploadJobCount: {
        get: function () {
          return parseInt(localStorage.getItem("maxUploadJobCount") || 3);
        },
        set: function (v) {
          return localStorage.setItem("maxUploadJobCount", v);
        }
      },

      maxDownloadJobCount: {
        get: function () {
          return parseInt(localStorage.getItem("maxDownloadJobCount") || 3);
        },
        set: function (v) {
          return localStorage.setItem("maxDownloadJobCount", v);
        }
      },

      showImageSnapshot: {
        get: function () {
          return parseInt(localStorage.getItem("showImageSnapshot") || 1);
        },
        set: function (v) {
          return localStorage.setItem("showImageSnapshot", v);
        }
      },

      historiesLength: {
        get: function () {
          return parseInt(localStorage.getItem("historiesLength") || 100);
        },
        set: function (v) {
          return localStorage.setItem("historiesLength", v);
        }
      },

      mailSmtp: {
        get: function () {
          return JSON.parse(
            localStorage.getItem("mailSender") || '{"port":465}'
          );
        },
        set: function (v) {
          return localStorage.setItem("mailSender", JSON.stringify(v));
        }
      }
    };
  }
]);