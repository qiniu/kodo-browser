angular.module("web").factory("Const", [
  function() {
    return {
      AUTH_INFO_KEY: "auth-info",
      CLOUD_CHOICE_KEY: "cloud-choice",
      OVERWRITE_UPLOADING: "overwrite-uploading",
      OVERWRITE_DOWNLOADING: "overwrite-downloading",

      REG: {
        EMAIL: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
      },

      bucketACL: [
        { acl: "public-read", label: "公共读" }, // 目前仅支持公共读
      ]
    };
  }
]);
