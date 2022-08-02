import webModule from '@/app-module/web'

import { noDataHtmlMapping } from "@template-mappings/components/directives"

const NO_DATA_DIRECTIVE = 'noData'

webModule
  .directive(NO_DATA_DIRECTIVE, function () {
    return {
      templateUrl: noDataHtmlMapping.path
    };
  });

export default NO_DATA_DIRECTIVE
