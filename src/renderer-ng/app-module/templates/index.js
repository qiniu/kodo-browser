import ng from '@/libCompatible/ng'

import urlTplMappings from './url-tpl-mappings'

export default ng.module('templates', [])
  .run(['$templateCache', function ($templateCache) {
    urlTplMappings.forEach(mapping => {
      $templateCache.put(mapping.path, mapping.content)
    })
  }])
