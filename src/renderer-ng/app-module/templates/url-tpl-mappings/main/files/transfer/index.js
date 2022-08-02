import uploadsHtml from "@/main/files/transfer/uploads.html"
import frameHtml from "@/main/files/transfer/frame.html"
import downloadsHtml from "@/main/files/transfer/downloads.html"

export const uploadsHtmlMapping = {
  path: 'main/files/transfer/uploads.html',
  content: uploadsHtml,
}
export const frameHtmlMapping = {
  path: 'main/files/transfer/frame.html',
  content: frameHtml,
}
export const downloadsHtmlMapping = {
  path: 'main/files/transfer/downloads.html',
  content: downloadsHtml,
}

export default [
  uploadsHtmlMapping,
  frameHtmlMapping,
  downloadsHtmlMapping,
]
