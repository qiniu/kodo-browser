# KODO Browser

[![LICENSE](https://img.shields.io/github/license/qiniu/kodo-browser.svg)](https://github.com/qiniu/kodo-browser/blob/master/LICENSE)
[![Build Status](https://travis-ci.org/qiniu/kodo-browser.svg?branch=master)](https://travis-ci.org/qiniu/kodo-browser)
[![GitHub release](https://img.shields.io/github/v/tag/qiniu/kodo-browser.svg?label=release)](https://github.com/qiniu/kodo-browser/releases)

KODO Browser 参考 [OSS Browser](https://github.com/aliyun/oss-browser.git) 设计，提供类似 Windows 资源管理器功能。用户可以很方便的浏览文件，上传下载文件，支持断点续传等。

本工具使用开源框架 [React](https://reactjs.org/) + [Electron](https://www.electronjs.org/) 制作。

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

### (1) 安装 Node.js v14 或 v16

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
├── build          # 打包好的 应用程序
├── dist           # 打包好的 js 代码
├── gulpfile.js
├── package.json
├── src
│   ├── common     # 通用模块
│   ├── main       # electron 主进程与子进程
│   └── renderer   # 前端子进程
└── webpack        # 打包工具
```

## 4. 私有云配置

将配置文件放在 `$HOME/.kodo-browser-v2/config.json`（如果是 Windows 10，则位置是 `C:\Users\<UserName>\.kodo-browser-v2\config.json`）下，配置文件示例如下：

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

编辑 `src/renderer/customize.ts` 中的代码然后重新打包以定制部分 OEM 功能，目前支持的 OEM 定制有：

* 禁止创建 Bucket
* 禁止删除 Bucket
* 禁止使用自有域名
* 配置升级检测地址

## 6. 启动配置项

将在 Kodo Browser 启动时尝试读取此配置。如已定义该配置，则支持借此改变部分 Kodo Browser 初始行为； 如未定义，也不影响 Kodo Browser 正常启动。

`launchConfig.json` 文件位于 Kodo Browser 可执行程序同级目录：

* Windows/Linux：`kodo-browser/launchConfig.json`
* macOS：`Kodo Browser.app/Contents/MacOS/launchConfig.json`

`launchConfig.json` 的格式具体参见 [launchConfig.schema.json](launchConfig.schema.json)。当前支持以下配置：

* `preferredEndpointType`，登录默认服务端类型。可用值：`public`（公有云）, `private`（私有云）；
* `defaultPrivateEndpointConfig`，私有云服务默认地址；
    * `ucUrl`，Bucket 管理服务地址，必须；
    * `regions`，区域信息，对于较新的私有云可选，详细请向管理员询问；
* `preferenceValidators`，配置部分设置表单的校验；并发越大传输速度不一定越快，请慎重调整。
    * `maxMultipartUploadPartSize`，最大上传分片大小
    * `maxMultipartUploadConcurrency`，最大上传分片并发数
    * `maxUploadJobConcurrency`，最大上传任务并发数
    * `maxDownloadJobConcurrency`，最大下载任务并发数
* `disable`，禁止某些功能；
    * `nonOwnedDomain`，非自有域名；

例如以下配置将修改默认登录私有云指定服务端：

```json
{
  "$schema": "https://github.com/qiniu/kodo-browser/blob/v2.1.0/lauchConfig.schema.json",
  "preferredEndpointType": "private",
  "defaultPrivateEndpointConfig": {
    "ucUrl": "http://uc.example.com",
    "regions": [
      {
        "id": "cn-east-1",
        "label": "华东",
        "endpoint": "http://s3.example.com"
      }
    ]
  }
}
```

当前 `$schema` 字段本身对程序运行无影响，但建议书写，表明当前配置文件是参考哪一版本编写的。

## 7. 开源 LICENSE

[Apache License 2.0](LICENSE)
