import preview from './preview'

import updateStorageClassModalHtml from '@/main/files/modals/update-storage-class-modal.html'
import restoreModalHtml from '@/main/files/modals/restore-modal.html'
import addExternalPathModalHtml from '@/main/files/modals/add-external-path-modal.html'
import renameModalHtml from '@/main/files/modals/rename-modal.html'
import showDownloadLinkModalHtml from '@/main/files/modals/show-download-link-modal.html'
import moveModalHtml from '@/main/files/modals/move-modal.html'
import addBucketModalHtml from '@/main/files/modals/add-bucket-modal.html'
import showDownloadLinksModalHtml from '@/main/files/modals/show-download-links-modal.html'
import restoreFilesModalHtml from '@/main/files/modals/restore-files-modal.html'
import deleteFilesModalHtml from '@/main/files/modals/delete-files-modal.html'
import updateStorageClassesModalHtml from '@/main/files/modals/update-storage-classes-modal.html'
import addFolderModalHtml from '@/main/files/modals/add-folder-modal.html'
import uploadConfirmModalHtml from '@/main/files/modals/upload-confirm-modal.html'

export const updateStorageClassModalHtmlMapping = {
  path: 'main/files/modals/update-storage-class-modal.html',
  content: updateStorageClassModalHtml,
}
export const restoreModalHtmlMapping = {
  path: 'main/files/modals/restore-modal.html',
  content: restoreModalHtml,
}
export const addExternalPathModalHtmlMapping = {
  path: 'main/files/modals/add-external-path-modal.html',
  content: addExternalPathModalHtml,
}
export const renameModalHtmlMapping = {
  path: 'main/files/modals/rename-modal.html',
  content: renameModalHtml,
}
export const showDownloadLinkModalHtmlMapping = {
  path: 'main/files/modals/show-download-link-modal.html',
  content: showDownloadLinkModalHtml,
}
export const moveModalHtmlMapping = {
  path: 'main/files/modals/move-modal.html',
  content: moveModalHtml,
}
export const addBucketModalHtmlMapping = {
  path: 'main/files/modals/add-bucket-modal.html',
  content: addBucketModalHtml,
}
export const showDownloadLinksModalHtmlMapping = {
  path: 'main/files/modals/show-download-links-modal.html',
  content: showDownloadLinksModalHtml,
}
export const restoreFilesModalHtmlMapping = {
  path: 'main/files/modals/restore-files-modal.html',
  content: restoreFilesModalHtml,
}
export const deleteFilesModalHtmlMapping = {
  path: 'main/files/modals/delete-files-modal.html',
  content: deleteFilesModalHtml,
}
export const updateStorageClassesModalHtmlMapping = {
  path: 'main/files/modals/update-storage-classes-modal.html',
  content: updateStorageClassesModalHtml,
}
export const addFolderModalHtmlMapping = {
  path: 'main/files/modals/add-folder-modal.html',
  content: addFolderModalHtml,
}
export const uploadConfirmModalHtmlMapping = {
  path: 'main/files/modals/upload-confirm-modal.html',
  content: uploadConfirmModalHtml,
}

export default [
  ...preview,
  updateStorageClassModalHtmlMapping,
  restoreModalHtmlMapping,
  addExternalPathModalHtmlMapping,
  renameModalHtmlMapping,
  showDownloadLinkModalHtmlMapping,
  moveModalHtmlMapping,
  addBucketModalHtmlMapping,
  showDownloadLinksModalHtmlMapping,
  restoreFilesModalHtmlMapping,
  deleteFilesModalHtmlMapping,
  updateStorageClassesModalHtmlMapping,
  addFolderModalHtmlMapping,
  uploadConfirmModalHtmlMapping,
]
