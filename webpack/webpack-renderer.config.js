// Node.JS package
const path = require("path");

// Webpack package
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

// project package
const paths = require("./paths");

module.exports = function(webpackEnv) {
  const isEnvDevelopment = webpackEnv.development;
  const isEnvProduction = webpackEnv.production;
  const shouldUseSourceMap = webpackEnv.sourcemap;

  return {
    devtool: isEnvProduction
        ? shouldUseSourceMap
            ? "source-map"
            : false
        : isEnvDevelopment && "source-map",
    target: "electron-renderer",
    mode: isEnvProduction ? "production" : isEnvDevelopment && "development",
    resolve: {
      alias: {
        "@common": paths.appCommon,
        "@renderer": paths.appRenderer,
      },
      extensions: [".ts", ".tsx", ".js"],
      aliasFields: [],
      mainFields: ['module', 'main'],
    },
    entry: {
      renderer: paths.appRendererIndex
    },
    output: {
      path: paths.appBuildRenderer,
      pathinfo: isEnvDevelopment,
      filename: isEnvProduction
          ? "[name].[chunkhash:8].js"
          : isEnvDevelopment && "[name].js",
      chunkFilename: isEnvProduction
          ? "[name].chunk.[chunkhash:8].js"
          : isEnvDevelopment && "[name].chunk.js",
      clean: true,
    },
    plugins: [
      ...paths.appPages.map(
          pagePath =>
              new HtmlWebpackPlugin({
                template: pagePath,
                inject: false,
              })
      ),
      new MiniCssExtractPlugin(),
      new CopyWebpackPlugin({
        patterns: [
          ...paths.appRendererCopies.map(copyFrom => ({
            from: copyFrom,
            to: `${paths.appBuildRenderer}/${copyFrom.split(path.sep).pop()}`,
          })),
          {
            from: paths.appPackageJson,
            to: paths.appBuild,
          },
        ],
      }),
    ],
    module: {
      rules: [
        {
          test: /\.js$/,
          enforce: "pre",
          use: ["source-map-loader"],
        },
        { test: /\.tsx?$/, loader: "ts-loader" },
        {
          test: /\.css$/i,
          use: [
            MiniCssExtractPlugin.loader,
            "css-loader",
          ],
        },
        {
          test: /\.s[ac]ss$/i,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: "css-loader",
              options: {
                sourceMap: true,
              },
            },
            {
              loader: "postcss-loader",
              options: {
                sourceMap: true,
              },
            },
            {
              loader: "sass-loader",
              options: {
                sourceMap: true,
              },
            },
          ],
        },
        {
          test: /\.html$/i,
          loader: "html-loader",
          options: {
            // Disables default attributes processing
            sources: false,
            minimize: {
              removeComments: false,
              collapseWhitespace: false,
              esModule: true, // default true
            },
          },
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
          type: "asset/resource",
          generator: {
            filename: "static/images/[name][ext]",
          },
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: "asset/resource",
          generator: {
            filename: "static/fonts/[name][ext]",
          },
        },
      ],
    },
    optimization: {
      splitChunks: {
        chunks: "all",
        cacheGroups: {
          libs: {
            name: "chunk-libs",
            test: /[\\/]node_modules[\\/]/,
            priority: 20,
            chunks: "initial", // only package third parties that are initially dependent
          },
          templates: {
            name: "chunk-templates",
            test: /\.html$/i,
            priority: 10,
            minChunks: 1,
          },
          components: {
            name: "chunk-components",
            test: paths.appRendererComponents,
            priority: 5,
            minChunks: 2,
          },
        },
      },
      minimize: isEnvProduction,
    },
    ignoreWarnings: [
      /Failed to parse source map/,
    ],
  };
};
