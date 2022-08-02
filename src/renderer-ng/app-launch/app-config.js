import moment from "moment"

import i18n from '@/i18n'

import { filesHtmlMapping } from "@template-mappings/main/files"
import filesCtrl from "@/main/files/files"
import { loginHtmlMapping } from "@template-mappings/main/auth"
import loginCtrl from "@/main/auth/login"

export default [
  "$stateProvider",
  "$urlRouterProvider",
  "$translateProvider",
  function($stateProvider, $urlRouterProvider, $translateProvider) {
    moment.locale("zh-CN");

    $stateProvider
      .state("files", {
        url: "/",
        templateUrl: filesHtmlMapping.path,
        controller: filesCtrl
      })
      .state("login", {
        url: "/login",
        templateUrl: loginHtmlMapping.path,
        controller: loginCtrl
      });

    $urlRouterProvider.otherwise("/");

    //i18n
    for (var k in i18n) {
      $translateProvider.translations(k, i18n[k].content);
    }
    $translateProvider.preferredLanguage("zh-CN");

    $translateProvider.useSanitizeValueStrategy("escapeParameters");
  }
]
