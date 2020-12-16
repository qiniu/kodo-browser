# KODO Browser

[![LICENSE](https://img.shields.io/github/license/qiniu/kodo-browser.svg)](https://github.com/qiniu/kodo-browser/blob/master/LICENSE)
[![Build Status](https://travis-ci.org/qiniu/kodo-browser.svg?branch=master)](https://travis-ci.org/qiniu/kodo-browser)
[![GitHub release](https://img.shields.io/github/v/tag/qiniu/kodo-browser.svg?label=release)](https://github.com/qiniu/kodo-browser/releases)

KODO Browser 参考 [OSS Browser](https://github.com/aliyun/oss-browser.git) 设计，提供类似 Windows 资源管理器功能。用户可以很方便的浏览文件，上传下载文件，支持断点续传等。

本工具使用开源框架 Angular 1.x + [Electron](http://electron.atom.io/)制作。

> Electron 框架可以让你使用 JavaScript，HTML 和 CSS 构建跨平台的桌面应用程序。它是基于node.js 和 Chromium 开源项目。Electron 可以打包出跨平台的程序，运行在 Mac，Windows 和 Linux 上。

## [使用手册 & 下载地址](https://developer.qiniu.com/kodo/tools/5972/kodo-browser)

## 1. 功能介绍:

```
功能
  |-- 登录：支持 AccessKey 和 SecretKey 登录
  |-- Bucket 管理: 新建 bucket，删除 bucket。
       |-- 文件管理：目录和文件的增删改查， 复制, 文件预览等。
             |-- 文件传输任务管理： 上传下载，断点续传。
  |-- 地址栏功能（支持 kodo://bucket/object，浏览历史前进后退，保存书签）
```


## 2. 开发环境搭建

> 如果你要在此基础上开发，请按照以下步骤进行。

### (1) 安装 Node.js v11.15.0

官网: https://nodejs.org/

### (2) 安装 cnpm

官网: https://cnpmjs.org/

cnpm 是 npm（node 包管理工具）的中国镜像，可以提高下载依赖包的效率。

### (3) 如果使用 Windows 系统，需要安装下列软件：

* 需要安装 git 和 choco:

请自行下载安装。

然后安装相关的依赖包。

```bash
choco install python vcredist-all make
```

### (4) 下载代码

```bash
git clone git@github.com:qiniu/kodo-browser.git
```

安装依赖:

```bash
make i
```

### (5) 运行

```bash
make run  # 开发模式运行，cmd+option+i 可用打开调试界面，Windows 或 Linux 按 F12
```

开发模式下，会自动监听源码，如有修改，会自动 build 前端代码到 dist 目录。


### (6) 打包

```bash
make build  # build 前端代码到 dist 目录
```

```bash
make win64  # 打包 win64 程序，可选: mac, dmg, linux64, linux32, win32, win64, all.
```


## 3. 代码结构

```
kodo-browser/
 |-- app/                 # 前端代码, 采用angular1.x + bootstrap3.x
 |-- node/                # 前端调用的 node 模块
     |-- qiniu-store/     # 上传下载 job 类
     |-- i18n/            # 国际化
 |-- vendor/              # 前端第三方库依赖
 |-- node_modules         # node 端依赖的模块
 |-- dist                 # 前端临时 build 出的代码
 |-- build                # electron build 出的应用
 |-- gulpfile.js          # 项目管理文件
 |-- package.json         # 项目描述文件
 |-- main.js              # 程序入口
```

## 4. 私有云配置

将配置文件放在 `$HOME/.kodo-browser/config.json`（如果是 Windows 10，则位置是 `C:\Users\<UserName>\.kodo-browser\config.json`）下，配置文件示例如下：

```json
{
    "regions": [
        {
            "id": "cn-east-1",
            "endpoint": "https://s3-cn-east-1.qiniucs.com"
        },
        {
            "id": "cn-north-1",
            "endpoint": "https://s3-cn-north-1.qiniucs.com"
        },
        {
            "id": "cn-south-1",
            "endpoint": "https://s3-cn-south-1.qiniucs.com"
        },
        {
            "id": "us-north-1",
            "endpoint": "https://s3-us-north-1.qiniucs.com"
        },
        {
            "id": "ap-southeast-1",
            "endpoint": "https://s3-ap-southeast-1.qiniucs.com"
        }
    ],
    "uc_url": "https://uc.qbox.me"
}
```

可以修改配置文件示例中的 `endpoint` 来修改服务器地址。

## 5. OEM 定制

编辑 `app/customize.js` 中的代码然后重新打包以定制部分 OEM 功能，目前支持的 OEM 定制有：

* 禁止创建 Bucket
* 禁止删除 Bucket
* 配置升级检测地址

## 6. 开源 LICENSE

[Apache License 2.0](LICENSE)
