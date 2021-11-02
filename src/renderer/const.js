import webModule from './app-module/web'

const CONST_FACTORY_NAME = 'Const'

webModule.factory(CONST_FACTORY_NAME, [
  function() {
    return {
      AUTH_INFO_KEY: "auth-info",
      CLOUD_CHOICE_KEY: "cloud-choice",
      EMPTY_FOLDER_UPLOADING: "empty-folder-uploading",
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

export default CONST_FACTORY_NAME
