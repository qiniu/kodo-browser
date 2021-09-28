import ng from "@/libCompatible/ng"

import i18n from '@/i18n'

import { TOAST_FACTORY_NAME as Toast } from "@/components/directives/toast-list"

export default [
  "$rootScope",
  "$translate",
  Toast,
  function($rootScope, $translate, Toast) {
    $rootScope.openURL = function(url) {
      openExternal(url);
    };

    // //i18n
    var langMap = {};
    var langList = [];
    ng.forEach(i18n, function(v, k) {
      langMap[k] = v;
      langList.push({
        lang: k,
        label: v.label
      });
    });
    var lang = localStorage.getItem("lang") || langList[0].lang;

    $rootScope.langSettings = {
      langList: langList,
      lang: lang,
      changeLanguage: function(key) {
        key = langMap[key] ? key : langList[0].lang;
        $translate.use(key);
        localStorage.setItem("lang", key);
        $rootScope.langSettings.lang = key;

        Toast.success($translate.instant("setup.success")); //'已经设置成功'
      }
    };

    $translate.use(lang);
  }
]
