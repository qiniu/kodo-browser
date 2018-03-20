const path = require("path");

module.exports = {
  //窗体title
  title: "S3 Browser",

  //app id，打包名称前缀
  appId: "s3-browser",

  //app名称，需要提供各个语言版本
  appName: {
    "zh-CN": "S3 浏览器",
    "en-US": "S3 Browser",
    "ja-JP": "S3 ブラウザ"
  },

  domain: "@qiniu.com",
  loginURL: "http://storage.tc.echosoul.cn",
  serviceURL: "http://s3-qos.tc.echosoul.cn",

  //logo png 格式, 主要用于mac和linux系统
  logo_png: path.join(__dirname, "./icon.png"),

  //logo icns 格式，主要用于mac系统
  logo_ico: path.join(__dirname, "./icon.icns"),

  //logo ico 格式，主要用于windows系统
  logo_ico: path.join(__dirname, "./icon.ico")

  //“关于”弹窗的主要内容
  //about_html: '<div>开源地址:</div>',
};
