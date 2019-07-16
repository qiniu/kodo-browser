const path = require("path");

module.exports = {
  //窗体title
  title: "KODO 浏览器",

  //app id，打包名称前缀
  appId: "kodo-browser",

  //app名称，需要提供各个语言版本
  appName: {
    "zh-CN": "KODO 浏览器",
    "en-US": "KODO Browser",
    "ja-JP": "KODOブラウザ"
  },

  // 是否显示公有与登录信息
  appCloud: 1,

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
