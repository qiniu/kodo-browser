'use strict'

const path = require('path');
const fs = require('fs');

const projectRoot = fs.realpathSync(process.cwd())
const resolveApp = relativePath => path.resolve(projectRoot, relativePath)

const buildPath = process.env.BUILD_PATH || 'dist';

const pages = [
  'src/renderer/index.ejs',
]
const copies = [
  'src/renderer/static',
]

module.exports = {
  appPath: resolveApp('.'),
  appBuild: resolveApp(buildPath),
  appPages: pages.map(resolveApp),
  appPackageJson: resolveApp('package.json'),
  appSrc: resolveApp('src'),
  appCommon: resolveApp('src/common'),
  appNodeModules: resolveApp('node_modules'),
  appWebpackCache: resolveApp('node_modules/.cache'),

  appMain: resolveApp('src/main'),
  appMainIndex: resolveApp('src/main/index.ts'),
  appMainDownloader: resolveApp('src/main/download-worker.ts'),
  appMainUploader: resolveApp('src/main/upload-worker.ts'),
  appBuildMain: resolveApp('dist/main'),

  appRenderer: resolveApp('src/renderer'),
  appBuildRenderer: resolveApp('dist/renderer'),
  appRendererIndex: resolveApp('src/renderer/index.tsx'),
  appRendererComponents: resolveApp('src/renderer/components'),
  appRendererCopies: copies.map(resolveApp)
}
