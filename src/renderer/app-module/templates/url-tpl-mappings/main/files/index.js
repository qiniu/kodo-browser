import common from './_'
import modals from './modals'
import transfer from './transfer'

import filesHtml from '@/main/files/files.html'

export const filesHtmlMapping = {
  path: 'main/files/files.html',
  content: filesHtml,
}

export default [
  ...common,
  ...modals,
  ...transfer,
  filesHtmlMapping
]
