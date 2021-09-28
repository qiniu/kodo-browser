import webModule from './app-module/web'

const CUSTOMIZE_FACTORY_NAME = "Customize"

webModule.factory(CUSTOMIZE_FACTORY_NAME, [
  function() {
    return {
      disable: {
        createBucket: false,
        deleteBucket: false
      },
      upgrade: {
        // Release Notes 目录后缀，里面有 ${version}.md, 如 1.0.0.md
        release_notes_url: "https://kodo-toolbox.qiniu.com/kodobrowser/release-notes/",

        // 升级检测链接
        check_url: "https://kodo-toolbox.qiniu.com/kodobrowser/update.json"
      }
    }
  }
]);

export default CUSTOMIZE_FACTORY_NAME
