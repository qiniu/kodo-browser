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
      ],

      regions: [
        {
          id: "cn-east-1",
          endpoint: "https://s3-cn-east-1.qiniucs.com"
        },
        {
          id: "cn-north-1",
          endpoint: "https://s3-cn-north-1.qiniucs.com"
        },
        {
          id: "cn-south-1",
          endpoint: "https://s3-cn-south-1.qiniucs.com"
        },
        {
          id: "us-north-1",
          endpoint: "https://s3-us-north-1.qiniucs.com"
        },
        {
          id: "ap-southeast-1",
          endpoint: "https://s3-ap-southeast-1.qiniucs.com"
        }
      ]
    };
  }
]);
