import topHtml from '@/main/_/top.html'
import loadingHtml from '@/main/_/loading.html'
import '@/main/_/loading.css'

export const topHtmlMapping = {
  path: 'main/_/top.html',
  content: topHtml,
}
export const loadingHtmlMapping = {
  path: 'main/_/loading.html',
  content: loadingHtml,
}

export default [
  topHtmlMapping,
  loadingHtmlMapping,
]
