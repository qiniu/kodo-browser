import webModule from '@/app-module/web'

import { loadingHtmlMapping } from "@template-mappings/main/_"

const IS_LOADING_DIRECTIVE_NAME = 'isLoading'

webModule
  .directive(IS_LOADING_DIRECTIVE_NAME, function () {
    return {
      templateUrl: loadingHtmlMapping.path,
    };
  });

export default IS_LOADING_DIRECTIVE_NAME
