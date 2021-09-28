import modals from './modals'

import loginHtml from '@/main/auth/login.html'

export const loginHtmlMapping = {
  path: 'main/auth/login.html',
  content: loginHtml,
}

export default [
  ...modals,
  loginHtmlMapping
]
