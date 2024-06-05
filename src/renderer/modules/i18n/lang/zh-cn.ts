import Dictionary from "./dict";

const dict: Dictionary = {
  common: {
    kodoBrowser: "Kodo 浏览器",
    empty: "暂无数据",
    ok: "确认",
    cancel: "取消",
    all: "全部",
    close: "关闭",
    save: "保存",
    saving: "保存中",
    saved: "已保存",
    submit: "提交",
    submitting: "提交中",
    submitted: "已提交",
    loading: "加载中",
    success: "成功",
    failed: "失败",
    refresh: "刷新",
    refreshing: "刷新中",
    refreshed: "已刷新",
    interrupt: "中断",
    retry: "重试",
    retrying: "重试中",
    notFound: "来到了无牛问津的地方",
    noObjectSelected: "未选择操作对象",
    noDomainToGet: "没有可用的域名获取对象",
    errored: "发生错误",
    paused: "已暂停",
    custom: "自定义",

    second: "秒",
    seconds: "秒",
    minute: "分钟",
    minutes: "分钟",
    hour: "小时",
    hours: "小时",

    directory: "目录",
    upload: "上传",
    download: "下载",
    downloading: "下载中",
    downloaded: "已下载",
    copy: "复制",
    move: "移动",
    paste: "粘贴",
    rename: "重命名",
    delete: "删除",
    more: "更多",
    exportLink: "导出外链",
    exportLinks: "导出外链",
    share: "分享",
    restore: "解冻",
    changeStorageClass: "更改存储类型",
    unknownStorageClass: "未知存储类型",
    clickToRetry: "点击重试",
  },

  deepLinkActions: {
    signIn: {
      invalidParams: "链接错误，缺少必要参数",
      signOutConfirm: {
        title: "退出登录",
        description: "退出登录以使用共享链接",
      },
    },
  },

  top: {
    files: "文件",
    externalPath: "外部路径",
    settings: "设置",
    bookmarks: "书签管理",
    about: "关于",
    language: "语言：",
    switchUser: "切换用户",
    signOut: "退出",
  },

  kodoAddressBar: {
    goBack: "后退",
    goForward: "前进",
    goUp: "上一级",
    refresh: "刷新",
    goHome: "首页",
    setHome: "保存为首页",
    setHomeSuccess: "保存首页成功",
    setBookmark: "保存书签",
    setBookmarkSuccess: "保存书签成功",
    deleteBookmark: "移除书签",
    deleteBookmarkSuccess: "已移除书签",
  },

  signIn: {
    title: "Access Key 登录",
    titleShareLink: "分享链接登录",
    accessKeyHistory: "AK 历史",
    gotoShareLinkForm: "使用分享链接登录",
    gotoAkForm: "使用 AK 登录",
    form: {
      accessKeyId: {
        holder: "请输入 AccessKeyId",
        label: "AccessKeyId：",
        feedback: {
          required: "AccessKeyId 不能为空",
        }
      },
      accessKeySecret: {
        holder: "请输入 AccessKeySecret",
        label: "AccessKeySecret：",
        feedback: {
          required: "AccessKeySecret 不能为空"
        },
      },
      endpoint: {
        label: "Endpoint：",
        options: {
          public: "默认（公有云）",
          private: "自定义（私有云）",
        }
      },
      description: {
        holder: "可以为空，最多 20 个字或字符",
        label: "备注：",
        feedback: {
          maxLength: "备注过长，最多 20 个字或字符",
        },
      },
      rememberMe: {
        label: "记住密钥",
        hint: "勾选“记住密钥”可保存 AK 密钥，再次登录时可直接从 AK 历史中选择该密钥登录。请不要在临时使用的电脑上勾选！",
      },
      submit: "登录",
      submitting: "登录中",
    },
    formShareLink: {
      shareLink: {
        label: "分享链接：",
        holder: "请输入文件夹分享链接",
        feedback: {
          invalidFormat: "链接格式不正确",
          invalidPrivateFormat: "链接格式不正确，非公有云用户请配置私有云分享地址",
        },
      },
      extractCode: {
        label: "提取码：",
        holder: "必须是字母或数字",
        feedback: {
          invalidFormat: "只能是字母数字，必须为 6 位",
        },
      },
    },
  },

  signOut: {
    title: "正在退出……",
  },

  switchUser: {
    title: "正在切换……",
    error: "切换失败：",
  },

  browse: {
    bucketToolbar: {
      createBucketButton: "新建 Bucket",
      moreOperation: {
        toggleButton: "更多",
        updateBucketRemarkButton: "编辑备注",
        deleteBucketButton: "删除",
      },
      search: {
        holder: "Bucket 名称",
      },
    },
    bucketTable: {
      bucketGrantedReadOnly: "授权只读",
      bucketGrantedReadWrite: "授权读写",
      bucketName: "Bucket 名称 / 备注",
      bucketRegion: "Bucket 区域",
      createTime: "创建时间",
    },
    externalPathToolBar: {
      addExternalPath: "添加外部路径",
      search: {
        holder: "外部路径",
      },
    },
    externalPathTable: {
      path: "外部路径",
      regionName: "区域",
    },
    fileToolbar: {
      createDirectory: "创建目录",
      uploadDirectory: "上传目录",
      search: {
        holder: "按名称前缀过滤",
      },
      domain: {
        nonOwnedDomain: "不使用自有域名",
        refreshTooltip: "刷新",
      },
      selectPrefix: {
        select: "选择当前路径所有项目，包括未加载的内容",
        selected: "已选择当前路径所有项目，包括未加载的内容。",
        clear: "清空选择",
      },
    },
    fileTable: {
      fileName: "名称",
      fileTypeOrSize: "类型/大小",
      fileStorageClass: "存储类型",
      fileModifyDate: "最后修改时间",
      fileOperation: "操作",
      emptyHint: "拖拽本地文件或目录至此处即可上传",
      loadMore: "加载更多",
      loadMoreFailed: "加载更多失败，",
    },
    restoreStatus: {
      label: "解冻状态：",
      normal: "无需解冻",
      frozen: "冻结",
      unfreezing: "解冻中",
      unfrozen: "已解冻",
    },
  },

  transfer: {
    jobItem: {
      pauseButton: "暂停",
      startButton: "开始",
      removeButton: "移除任务",
      retryButton: "重试",
      retryWithOverwriteButton: "覆盖重试",
      status: {
        finished: "完成",
        failed: "失败",
        stopped: "暂停",
        waiting: "等待",
        running: "运行中",
        duplicated: "重复",
        verifying: "验证中",
      },
      removeConfirmOk: "移除",
      unknownError: "未知错误",
      fileDuplicated: "文件已存在",
    },
    upload: {
      dropZone: {
        enter: "拖入此处以上传",
        over: "松开以上传",
      },
      dialog: {
        title: "选择上传文件",
      },
      hint: {
        addingJobs: "正在添加到上传队列…",
        addedJobs: "已全部添加至上传队列",
        addedJobsErrored: "由于访问错误，部分文件未添加至上传队列",
      },
      error: {
        nothing: "没有发现任何可以上传的文件",
        duplicatedBasename: "所选项目存在同名文件或目录",
      },
      toolbar: {
        search: {
          holder: "根据名称搜索",
        },
        emptyDirectorySwitch: "是否空目录上传",
        startAllButton: "启动全部",
        cleanupButton: "清理已完成",
        removeAllButton: "清空全部",
      },
      removeAllConfirm: {
        title: "移除所有上传任务",
        content: "确定要移除所有上传任务吗？",
        ok: "移除",
        cancel: "取消",
      },
    },
    download: {
      dialog: {
        title: "选择下载位置",
      },
      hint: {
        addingJobs: "正在添加到下载队列…",
        addedJobs: "已全部添加至下载队列…",
      },
      toolbar: {
        search: {
          holder: "根据名称搜索",
        },
        overwriteSwitch: "是否覆盖下载",
        startAllButton: "启动全部",
        cleanupButton: "清理已完成",
        removeAllButton: "清空全部",
      },
      removeAllConfirm: {
        title: "移除所有下载任务",
        content: "确定要移除所有下载任务吗？",
        ok: "移除",
        cancel: "取消",
      },
    },
  },

  forms: {
    changeStorageClass: {
      fileName: {
        label: "文件名：",
      },
      currentStorageClass: {
        label: "当前存储类型：",
      },
      storageClassKodoName: {
        label: "存储类型：",
      },
    },
    generateLink: {
      fileName: {
        label: "文件名：",
      },
      domainType: {
        cdn: "CDN 域名",
        origin: "源站域名",
      },
      domainName: {
        label: "域名：",
        nonOwnedDomain: "不使用自有域名",
        feedback: {
          emptyFileNameByS3Hint: "空名文件不可使用 S3 域名导出外链",
        },
      },
      expireAfter: {
        label: "有效期：",
        suffix: "秒",
        hint: "范围 ${min}-${max}",
      },
      fileLink: {
        label: "文件链接：",
        copied: "已复制",
      },
      errors: {
        domainNotFound: "无法获取到所选择的域名信息",
      },
    },
    restore: {
      frozen: {
        loading: "正在检查文件解冻状态",
        normal: "该文件存储类型无需解冻",
        unfreezing: "文件正在解冻中，请耐心等待",
        unfrozen: "文件已解冻，无需再次操作",
        unknown: "未知的解冻状态",
      },
      fileName: {
        label: "文件名：",
      },
      days: {
        label: "解冻天数：",
      },
    },
  },

  modals: {
    privateCloudSettings: {
      title: "自定义设置",
      region: "区域",
      appendRegionButton: "添加区域",
      removeRegionButton: "删除",
      form: {
        ucUrl: {
          label: "UC 服务：",
          holder: "请输入 UC 服务 URL",
          feedback: {
            required: "必须输入 UC 服务 URL",
            pattern: "UC 服务 URL 必须以 http(s):// 开头",
          }
        },
        regionsSwitch: {
          label: "区域设置：",
          hint: {
            disabled: "UC 服务不支持自动查询区域",
          },
        },
        regionIdentifier: {
          label: "区域 ID：",
          holder: "请输入区域 ID",
          feedback: {
            required: "必须输入区域 ID",
          },
        },
        regionName: {
          label: "区域名：",
          holder: "请输入区域名",
        },
        regionEndpoint: {
          label: "Endpoint：",
          holder: "请输入 Endpoint",
          feedback: {
            required: "必须输入 Endpoint",
            pattern: "Endpoint 必须以 http(s):// 开头",
          },
        },
      },
    },

    akHistory: {
      title: "AK 历史",
      removeAllButton: "清空历史",
      useAkButton: "使用",
      removeAkButton: "删除",
      currentUser: "（使用中）",
      table: {
        endpoint: "Endpoint",
        accessKeyId: "AccessKeyId",
        accessKeySecret: "AccessKeySecret",
        description: "备注",
        operation: "操作",
      },
    },

    releaseNote: {
      title: "主要更新",
    },

    settings: {
      title: "设置",
      saved: "设置已保存",
      upload: {
        legend: "上传",
        form: {
          resumeUpload: {
            label: "断点上传：",
            hint: "（启动断点上传功能）",
          },
          multipartUploadThreshold: {
            label: "分片上传阈值：",
            hint: "单位：MB，范围：10 MB - 1000 MB",
          },
          multipartUploadPartSize: {
            label: "分片上传片大小：",
            hint: "单位：MB，范围：${min} MB - ${max} MB",
          },
          multipartUploadConcurrency: {
            label: "分片上传片并发数：",
            hint: "范围：${min}-${max}",
          },
          maxUploadConcurrency: {
            label: "最大上传任务数：",
            hint: "范围：${min}-${max}",
          },
          enabledUploadSpeedLimit: {
            label: "上传限速：",
            hint: "（启动上传限速功能）",
          },
          uploadSpeedLimit: {
            label: "单个文件上传限速：",
            hint: "单位：KB/s，范围：1 KB/s - 102400 KB/s",
          },
        },
      },
      download: {
        legend: "下载",
        form: {
          resumeDownload: {
            label: "断点下载：",
            hint: "（启动断点下载功能）",
          },
          multipartDownloadThreshold: {
            label: "断点下载阈值：",
            hint: "单位：MB，范围：10 MB - 1000 MB",
          },
          multipartDownloadPartSize: {
            label: "断点下载片大小：",
            hint: "单位：MB，范围：8 MB - 100 MB",
          },
          maxDownloadConcurrency: {
            label: "最大下载任务数：",
            hint: "范围：${min}-${max}",
          },
          enabledDownloadSpeedLimit: {
            label: "下载限速：",
            hint: "（启动下载限速功能）",
          },
          downloadSpeedLimit: {
            label: "单个文件下载限速：",
            hint: "单位：KB/s，范围：1 KB/s - 102400 KB/s",
          },
        },
      },
      externalPath: {
        legend: "外部路径",
        form: {
          enabled: {
            label: "外部路径：",
            hint: "（启用外部路径）"
          },
        },
      },
      others: {
        legend: "系统设置",
        form: {
          isDebug: {
            label: "调试日志：",
            hint: "是否开启调试日志",
          },
          enabledLoadFilesOnTouchEnd: {
            label: "文件列表分页加载：",
            hint: "（分页加载更多）",
          },
          loadFilesNumberPerPage: {
            label: "文件列表单次加载数目：",
            hint: "范围：10-1000",
          },
          autoUpgrade: {
            label: "自动更新：",
            hint: "自动下载更新包",
          },
          language: {
            label: "语言：",
          },
        },
      },
    },

    bookmarkManager: {
      title: "书签管理",
      removeBookmarkButton: "删除",
      table: {
        url: "URL",
        createTime: "添加时间",
        operation: "操作",
      }
    },

    about: {
      title: "关于",
      openSourceAddress: "开源地址：",
      updateApp: {
        checking: "正在检查新版本……",
        alreadyLatest: "已是最新版！",
        foundLatest: "发现新版本",
        changeLogsTitle: "主要更新：",
        downloadManually: "手动下载",
        operationButton: {
          start: "开始下载",
          resume: "继续下载",
          pause: "暂停下载",
          showItemInDir: "打开文件所在位置",
        },
      },
    },

    createBucket: {
      title: "创建 Bucket",
      form: {
        bucketName: {
          label: "名称：",
          holder: "Bucket 名称",
          tips: "由 3 ~ 63 个字符组成 ，可包含小写字母、数字和短划线，且必须以小写字母或者数字开头和结尾",
          feedback: {
            required: "必须输入名称",
            pattern: "格式不正确",
          },
        },
        region: {
          label: "区域：",
          feedback: {
            required: "必须选择一个区域",
          },
        },
        acl: {
          label: "ACL 权限：",
          options: {
            inherit: "继承 Bucket",
            publicReadWrite: "公共读写",
            publicRead: "公共读",
            private: "私有",
          },
          feedback: {
            required: "必须选择一个 ACL 权限",
          },
        },
      },
    },

    updateBucketRemark: {
      title: "编辑 Bucket 备注",
      form: {
        bucketName: {
          label: "名称：",
        },
        bucketRemark: {
          label: "备注：",
          holder: "最多不超过 100 个字符",
        },
      },
    },

    deleteBucket: {
      title: "删除 Bucket",
      content: "Bucket 名称：${bucketName}，确定删除？",
      submit: "删除",
    },

    addExternalPath: {
      title: "添加外部路径",
      submit: "添加",
      form: {
        region: {
          label: "区域：",
          feedback: {
            required: "必须选择一个区域",
          }
        },
        path: {
          label: "路径：",
          holder: "Bucket/Object-Prefix",
          feedback: {
            required: "必须输入路径",
          },
          hint: "填写通过 Bucket Policy 被授予权限的某个 Bucket 或 Bucket 下的某个路径，需由授权者提供",
        },
      },
      error: {
        duplicated: "该路径已存在",
      },
    },

    deleteExternalPath: {
      title: "删除外部路径",
      content: "外部路径：${externalPathUrl}；\n区域：${regionName}；\n确定删除？",
      submit: "删除",
    },

    createDirectory: {
      title: "创建目录",
      form: {
        directoryName: {
          label: "目录名：",
          hint: "目录名中不能包含 /",
        },
      },
    },

    renameFile: {
      title: "重命名",
      form: {
        baseDirectory: {
          label: "所在目录：",
        },
        fileName: {
          label: "重命名：",
          hint: "不能以 / 开头或结尾，中间不能存在连续的 /；不能与原位置相同",
        },
      },
      replaceConfirm: {
        description: "检测到同名文件，是否覆盖？",
        yes: "覆盖",
      },
    },

    deleteFiles: {
      title: "删除文件",
      description: "将要删除以下文件或目录",
      prefixDescription: "将要删除以下路径的所有内容",
    },

    copyFiles: {
      title: "复制文件",
      hintFiltered: "禁止同目录或空名文件复制，当前复制已被过滤",
      description: "将${operation}以下文件或目录到当前目录下（如有相同的文件或目录则覆盖）",
      prefixDescription: "将${operation}以下路径的所有内容到当前目录下（如有相同的文件或目录则覆盖）",
      form: {
        fileName: {
          label: "副本文件名：",
          hint: "不能以 / 开头或结尾，中间不能存在连续的 /；不能与原位置相同"
        },
      },
      replaceConfirm: {
        description: "检测到同名文件，是否覆盖？",
        yes: "覆盖",
      },
    },

    moveFiles: {
      title: "移动文件",
      hintFiltered: "禁止同目录或空名文件移动，当前移动已被过滤",
      description: "将${operation}以下文件或目录到当前目录下（如有相同的文件或目录则覆盖）",
      prefixDescription: "将${operation}以下路径的所有内容到当前目录下（如有相同的文件或目录则覆盖）",
      form: {
        fileName: {
          label: "新的文件名：",
          hint: "不能以 / 开头或结尾，中间不能存在连续的 /"
        },
      },
      replaceConfirm: {
        description: "检测到同名文件，是否覆盖？",
        yes: "覆盖",
      },
    },

    changeFilesStorageClass: {
      title: "修改文件存储类型",
      description: "将修改以下文件或目录的存储类型",
      prefixDescription: "将修改以下路径所有内容的存储类型",
    },

    changeFileStorageClass: {
      title: "修改文件存储类型",
    },

    restoreFiles: {
      title: "解冻文件",
      description: "将解冻以下文件或目录：",
      prefixDescription: "将解冻以下路径的所有内容：",
    },

    restoreFile: {
      title: "解冻文件",
    },

    generateFileLinks: {
      title: "导出外链",
      description: "将导出以下文件的外链",
      prefixDescription: "将导出以下路径所有内容的外链",
      hintFiltered: "空名文件不可导出外链，已过滤",
      csvFile: {
        label: "导出文件位置：",
        suffix: "打开文件所在位置",
      },
      selectLocalPathDialog: {
        title: "选择导出位置",
        error: {
          cancelOrNoSelected: "用户取消或未选择存储路径",
        },
      },
    },

    generateFileLink: {
      title: "导出外链",
    },

    createDirectoryShareLink: {
      title: "分享文件夹",
      form: {
        directoryName: {
          label: "文件夹：",
        },
        expireAfter: {
          label: "有效期：",
          suffix: "秒",
          hint: "范围：${minSeconds} - ${maxSeconds} 秒"
        },
        extractCode: {
          label: "提取码：",
          suffix: "随机生成",
          hint: "必须为 6 位，只能由字母数字组成",
        },
        shareLink: {
          label: "分享链接：",
        },
        expiredAt: {
          label: "失效时间：",
        },
      },
      copyShareMessageButton: "复制链接与提取码",
      copyShareMessageSuccess: "复制成功",
      shareMessage: [
        "我分享了一些文件给您，快来看看吧！",
        "",
        "${shareLink}",
        "",
        "提取码：${extractCode}",
        "有效期至：${expiredAt}"
      ].join("\n"),
    },

    uploadConfirm: {
      title: "上传文件",
      previewList: {
        title: "将上传以下文件或目录",
        more: "… 共 ${total} 个文件/目录",
      },
      form: {
        isOverwrite: {
          label: "覆盖上传：",
          hint: "（仅本次）",
        },
        storageClassKodoName: {
          label: "存储类型：",
        },
      },
    },

    preview: {
      title: "预览",
      back: "返回预览",
      preCheck: {
        archived: {
          description: "归档文件，需要解冻才能预览或下载。",
          restore: "进行解冻",
        },
        tooLarge: {
          noPreview: "当前文件过大（>${maxPreviewSize}），无法预览",
          previewWarning: "当前文件过大（>${maxPreviewSize}），预览加载时间可能较长、也会产生相应的流量费用。",
          forcePreview: "继续预览",
        },
      },
      content: {
        code: {
          showDiffView: "保存",
          saveContent: "确认保存",
        },
        others: {
          description: "该文件类型无法预览。",
          openAsText: "尝试以文本方式打开",
        }
      },
      error: {
        emptyFileNameByS3Hint: "无法使用 S3 域名预览空名文件",
        failedGenerateLink: "获取预览链接失败",
        failedGetContent: "获取文件内容失败",
        contentNotChanged: "内容没有修改",
      },
    },
    // end modals
  },
};

export default dict;
