import isLoadingHtml from  '@/components/directives/is-loading.html'
import noDataHtml from '@/components/directives/no-data.html'
import toastListHtml from '@/components/directives/toast-list.html'

export const isLoadingHtmlMapping = {
  path: 'components/directives/is-loading.html',
  content: isLoadingHtml,
}
export const noDataHtmlMapping = {
  path: 'components/directives/no-data.html',
  content: noDataHtml,
}
export const toastListHtmlMapping = {
  path: 'components/directives/toast-list.html',
  content: toastListHtml,
}

export default [
  isLoadingHtmlMapping,
  noDataHtmlMapping,
  toastListHtmlMapping,
]
