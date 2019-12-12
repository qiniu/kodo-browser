angular.module("web").factory("Const", [
  function() {
    function getStorageClasses(f) {
      var storageClasses = [
        { value: "Standard", name: "标准类型" }, //标准类型
        { value: "IA", name: "低频访问类型" } //低频访问类型
      ];
      switch (f) {
        case 2:
          return storageClasses;
        default:
          return [{ value: "Standard", name: "标准类型" }]; //标准类型
      }
    }

    return {
      AUTH_INFO_KEY: "auth-info",
      CLOUD_CHOICE_KEY: "cloud-choice",
      AUTH_KEEP: "auth-keep",
      AUTH_HIS: "auth-his",
      OVERWRITE_UPLOADING: "overwrite-uploading",
      OVERWRITE_DOWNLOADING: "overwrite-downloading",

      REG: {
        EMAIL: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
      },

      bucketACL: [
        { acl: "public-read", label: "公共读" }, // 目前仅支持公共读
      ],

      //http://7xp1d8.com1.z0.glb.clouddn.com/intro.html
      regions: [
        {
          id: "cn-east-1",
          label: "华东",
          endpoint: "https://s3-cn-east-1.qiniucs.com",
          storageClasses: getStorageClasses(2)
        },
        {
          id: "cn-north-1",
          label: "华北",
          endpoint: "https://s3-cn-north-1.qiniucs.com",
          storageClasses: getStorageClasses(2)
        },
        {
          id: "cn-south-1",
          label: "华南",
          endpoint: "https://s3-cn-south-1.qiniucs.com",
          storageClasses: getStorageClasses(2)
        },
        {
          id: "us-north-1",
          label: "北美",
          endpoint: "https://s3-us-north-1.qiniucs.com",
          storageClasses: getStorageClasses(2)
        },
        {
          id: "ap-southeast-1",
          label: "东南亚",
          endpoint: "https://s3-ap-southeast-1.qiniucs.com",
          storageClasses: getStorageClasses(2)
        }
      ]
    };
  }
]);
