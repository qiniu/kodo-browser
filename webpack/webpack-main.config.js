// main config
const paths = require('./paths')

module.exports = function(webpackEnv) {
  const isEnvDevelopment = webpackEnv.development
  const isEnvProduction = webpackEnv.production

  return {
    target: 'electron-main',
    mode: isEnvProduction ? 'production' : isEnvDevelopment && 'development',
    entry: {
      main: paths.appMainIndex,
      'download-worker': paths.appMainDownloadWorker,
      'upload-worker': paths.appMainUploadWorker,
    },
    output: {
      filename: '[name]-bundle.js',
      chunkFilename: isEnvProduction
        ? '[name].chunk.[chunkhash:8].js'
        : isEnvDevelopment && '[name].chunk.js',
      path: paths.appBuildMain,
      clean: true,
    },
    optimization: {
      splitChunks: {
        chunks: "all",
        cacheGroups: {
          libs: {
            name: 'chunk-libs',
            test: /[\\/]node_modules[\\/]/,
            priority: 20,
            chunks: 'initial' // only package third parties that are initially dependent
          },
        },
      },
      minimize: isEnvProduction,
    },
  }
}
