import Dictionary from "./dict";

const dict: Dictionary = {
  common: {
    kodoBrowser: "Kodo Browser",
    empty: "Empty",
    ok: "OK",
    cancel: "Cancel",
    close: "Close",
    save: "Save",
    saving: "Saving",
    saved: "Saved",
    submit: "Submit",
    submitting: "Submitting",
    submitted: "Submitted",
    loading: "Loading",
    success: "Success",
    failed: "Failed",
    refresh: "Refresh",
    interrupt: "Interrupt",
    notFound: "Page Not Found!",
    noOperationalObject: "No object selected",
    noDomainToGet: "No domain to get object",
    errored: "An error has occurred",
    paused: "Paused",

    directory: "Directory",
    upload: "Upload",
    download: "Download",
    downloading: "Downloading",
    downloaded: "Downloaded",
    copy: "Copy",
    move: "Move",
    paste: "Paste",
    rename: "Rename",
    delete: "Delete",
    more: "More",
    extraLink: "Export extra link",
    extraLinks: "Export extra links",
    restore: "Restore",
    changeStorageClass: "Change storage class",
  },

  top: {
    files: "Files",
    externalPath: "ExternalPath",
    settings: "Settings",
    bookmarks: "Bookmarks",
    about: "About",
    language: "Language:",
    switchUser: "Switch User",
    signOut: "Sign Out",
  },

  kodoAddressBar: {
    goBack: "Go Back",
    goForward: "Go Forward",
    goUp: "Go Up",
    refresh: "Refresh",
    goHome: "Go Home",
    setHome: "Set Home",
    setHomeSuccess: "Saved homepage successfully",
    setBookmark: "Set Bookmark",
    setBookmarkSuccess: "Saved bookmark successfully",
    deleteBookmark: "Remove bookmarks",
    deleteBookmarkSuccess: "Remove bookmarks successfully",
  },

  signIn: {
    title: "access key sign in",
    accessKeyHistory: "AK History",
    form: {
      accessKeyId: {
        holder: "AccessKeyId",
        label: "AccessKeyId：",
        feedback: {
          required: "AccessKeyId is required",
        }
      },
      accessKeySecret: {
        holder: "AccessKeySecret",
        label: "AccessKeySecret",
        feedback: {
          required: "AccessKeySecret is required"
        },
      },
      endpoint: {
        label: "Endpoint:",
        options: {
          public: "Default (Public Cloud)",
          private: "Customized (Private Cloud)",
        }
      },
      description: {
        holder: "Optional, max 20 characters",
        label: "Description:",
        feedback: {
          maxLength: "Too long, max 20 characters",
        },
      },
      rememberMe: {
        label: "Remember",
        hint: "Check \"Remember\" will save the AK. When you sign in again, click AK History to select the key to sign in. You do not need to enter AK / SK manually. Please do NOT check it on a public computer!",
      },
      submit: "Sign in",
      submitting: "Signing in",
    },
  },

  signOut: {
    title: "Signing out……",
  },

  switchUser: {
    title: "Switching user……",
    error: "Switch user errored:",
  },

  browse: {
    bucketToolbar: {
      createBucketButton: "Create bucket",
      moreOperation: {
        toggleButton: "more",
        deleteBucketButton: "Delete bucket",
      },
      search: {
        holder: "Bucket name",
      },
    },
    bucketTable: {
      bucketGrantedReadOnly: "Read Only",
      bucketGrantedReadWrite: "Read Write",
      bucketName: "Bucket name",
      bucketRegion: "Bucket region",
      createTime: "Create time",
    },
    fileToolbar: {
      createDirectory: "Create directory",
      search: {
        holder: "Filter by name prefix",
      },
      domain: {
        nonOwnedDomain: "Non owned domain",
        refreshTooltip: "Refresh",
      },
    },
    fileTable: {
      fileName: "Name",
      fileTypeOrSize: "Type/Size",
      fileStorageClass: "Storage class",
      fileModifyDate: "Last modify date",
      fileOperation: "Operation",
      loadMore: "Load more",
    },
    restoreStatus: {
      label: "Status: ",
      normal: "Normal",
      frozen: "Archived",
      unfreezing: "Restoring",
      unfrozen: "Restored",
    },
  },

  transfer: {
    jobItem: {
      pauseButton: "Pause",
      startButton: "Start",
      removeButton: "Remove",
      retryButton: "Retry",
      retryWithOverwriteButton: "Overwrite retry",
      status: {
        finished: "Finished",
        failed: "Failed",
        stopped: "Stopped",
        waiting: "Waiting",
        running: "Running",
        duplicated: "Duplicated",
        verifying: "Verifying",
      },
      removeConfirmOk: "Remove",
      unknownError: "unknown error",
      fileDuplicated: "File duplicated",
    },
    upload: {
      dropZone: {
        enter: "Drag here to upload",
        over: "Release to upload",
      },
      dialog: {
        title: "Select upload file",
      },
      hint: {
        addingJobs: "Adding to upload queue…",
        addedJobs: "All files have been added to the upload queue",
      },
      error: {
        nothing: "No files were found to upload",
        duplicatedBasename: "Duplicated name in selected files or directories",
      },
      toolbar: {
        search: {
          holder: "Filter by name or status",
        },
        emptyDirectorySwitch: "Allow uploading empty folder",
        startAllButton: "Start All",
        cleanupButton: "Clean UP",
        removeAllButton: "Remove All",
      },
      removeAllConfirm: {
        title: "Remove all uploads",
        content: "Are you sure to remove all upload tasks?",
        ok: "Remove",
        cancel: "Cancel",
      },
    },
    download: {
      dialog: {
        title: "Select download address",
      },
      hint: {
        addingJobs: "Adding to download queue…",
        addedJobs: "All files have been added to the download queue",
      },
      toolbar: {
        search: {
          holder: "Filter by name or status",
        },
        overwriteSwitch: "Overwrite download",
        startAllButton: "Start All",
        cleanupButton: "Clean Up",
        removeAllButton: "Remove all",
      },
      removeAllConfirm: {
        title: "Remove all downloads",
        content: "Are you sure to remove all download tasks?",
        ok: "Remove",
        cancel: "Cancel",
      },
    },
  },

  forms: {
    changeStorageClass: {
      fileName: {
        label: "File Name：",
      },
      currentStorageClass: {
        label: "Current storage class：",
      },
      storageClassKodoName: {
        label: "Storage Class：",
      },
    },
    generateLink: {
      fileName: {
        label: "File Name：",
      },
      domainName: {
        label: "Domain Name：",
        nonOwnedDomain: "No owned domain name",
      },
      expireAfter: {
        label: "Validity period：",
        suffix: "Second",
      },
      fileLink: {
        label: "File Link：",
        copied: "The file link was copied",
      },
    },
    restore: {
      frozen: {
        loading: "Checking file restore status",
        normal: "The file storage type does not need to be restored",
        unfreezing: "File is recovering, please be patient ...",
        unfrozen: "The file is restored and does not need to be done again",
        unknown: "Unknown restored status",
      },
      fileName: {
        label: "File Name：",
      },
      days: {
        label: "Restore days：",
      },
    },
  },

  modals: {
    privateCloudSettings: {
      title: "Region Settings",
      region: "Region",
      appendRegionButton: "Add region",
      removeRegionButton: "Remove",
      form: {
        ucUrl: {
          label: "UC URL:",
          holder: "UC URL",
          feedback: {
            required: "UC URL is required",
            pattern: "UC URL is not start with http(s)://",
          }
        },
        regionIdentifier: {
          label: "Region ID:",
          holder: "Region ID",
          feedback: {
            required: "Region ID is required",
          },
        },
        regionName: {
          label: "Region Name:",
          holder: "Region Name",
        },
        regionEndpoint: {
          label: "Endpoint:",
          holder: "Endpoint",
          feedback: {
            required: "Endpoint is required",
          },
        },
      },
    },

    akHistory: {
      title: "AK History",
      removeAllButton: "Clear Histories",
      activeAkButton: "Active",
      removeAkButton: "Remove",
      currentUser: "(current)",
      table: {
        endpoint: "Endpoint",
        accessKeyId: "AccessKeyId",
        accessKeySecret: "AccessKeySecret",
        description: "Description",
        operation: "Operations",
      },
    },

    releaseNote: {
      title: "Changes",
    },

    settings: {
      title: "Setting",
      saved: "Setting Saved",
      upload: {
        legend: "Upload",
        form: {
          resumeUpload: {
            label: "Breakpoint Upload：",
            hint: "（Start breakpoint upload feature）",
          },
          multipartUploadThreshold: {
            label: "Multipart upload threshold：",
            hint: "Unit：MB，Range：10 MB - 1000 MB",
          },
          multipartUploadPartSize: {
            label: "Multipart upload part size：",
            hint: "Unit：MB，Range：8 MB - 100 MB",
          },
          maxUploadConcurrency: {
            label: "Maximum number of upload tasks：",
            hint: "Range：1-10",
          },
          enabledUploadSpeedLimit: {
            label: "Upload speed limit：",
            hint: "（Enable upload speed limit）",
          },
          uploadSpeedLimit: {
            label: "Upload single file speed limit：",
            hint: "Unit：KB/s，Range：1 KB/s - 102400 KB/s",
          },
        },
      },
      download: {
        legend: "Download",
        form: {
          resumeDownload: {
            label: "Breakpoint Download：",
            hint: "（Enable Breakpoint feature）",
          },
          multipartDownloadThreshold: {
            label: "Multipart download threshold：",
            hint: "Unit：MB，Range：10 MB - 1000 MB",
          },
          multipartDownloadPartSize: {
            label: "Multipart download part size：",
            hint: "Unit：MB，Range：8 MB - 100 MB",
          },
          maxDownloadConcurrency: {
            label: "Maximum number of download tasks：",
            hint: "Range：1-10",
          },
          enabledDownloadSpeedLimit: {
            label: "Download speed limit：",
            hint: "（Enable download speed limit）",
          },
          downloadSpeedLimit: {
            label: "Download single file speed limit：",
            hint: "Unit：KB/s，Range：1 KB/s - 102400 KB/s",
          },
        },
      },
      externalPath: {
        legend: "External Path",
        form: {
          enabled: {
            label: "External Path",
            hint: "（Enable External Path）"
          },
        },
      },
      others: {
        legend: "System Settings",
        form: {
          isDebug: {
            label: "Debug",
            hint: "Enable debug log",
          },
          enabledLoadFilesOnTouchEnd: {
            label: "File list load more on touch end",
            hint: "（Enable file list load more on touch end）",
          },
          loadFilesNumberPerPage: {
            label: "Files loading count",
            hint: "Range：10-1000",
          },
          autoUpgrade: {
            label: "Auto update",
            hint: "Download update package automatically",
          },
          language: {
            label: "Language",
          },
        },
      },
    },

    bookmarkManager: {
      title: "Bookmark Manager",
      removeBookmarkButton: "Remove",
      table: {
        url: "URL",
        createTime: "Create Time",
        operation: "Operation",
      }
    },

    externalPathManager: {
      title: "External Path Manager",
      addButton: "Add",
      removeButton: "Delete",
      error: {
        duplicated: "The path is existed!",
      },
      form: {
        region: {
          label: "region:",
          feedback: {
            required: "Region is required",
          },
        },
        path: {
          label: "Path:",
          holder: "Bucket/Object-Prefix",
          feedback: {
            required: "Path is required",
          },
          hint: "Fill in a bucket or a path under a bucket that is granted permission through Bucket Policy, provided by the grantor",
        },
      },
      table: {
        path: "External Path",
        regionName: "Region Name",
        operation: "Operation",
      },
    },

    about: {
      title: "About",
      openSourceAddress: "Open Source Address：",
      updateApp: {
        checking: "Checking new version...",
        alreadyLatest: "You're up to date!",
        foundLatest: "A new version is available!",
        changeLogsTitle: "Changes:",
        operationButton: {
          start: "Download",
          resume: "Resume",
          pause: "Pause",
          showItemInDir: "Show File in Directory",
        },
      },
    },

    createBucket: {
      title: "Create Bucket",
      form: {
        bucketName: {
          label: "Name：",
          holder: "Bucket Name",
          tips: "Consists of 3 to 63 characters, can contain lowercase letters, numbers, and dashes, and must begin and end with a lowercase letter or number",
          feedback: {
            required: "Name Required",
            pattern: "Wrong Pattern",
          },
        },
        region: {
          label: "Region：",
          feedback: {
            required: "Must select a region",
          },
        },
        acl: {
          label: "ACL Permission：",
          options: {
            inherit: "Inherit From Bucket",
            publicReadWrite: "Public Read Write",
            publicRead: "Public Read",
            private: "Private",
          },
          feedback: {
            required: "Must select ACL permission",
          },
        },
      },
    },

    deleteBucket: {
      title: "Delete Bucket",
      content: "Bucket Name：${bucketName}， Are you sure you want to delete this bucket？",
      submit: "Delete",
    },

    createDirectory: {
      title: "Create Directory",
      form: {
        directoryName: {
          label: "Directory Name：",
          hint: "Directory name cannot be included /",
        },
      },
    },

    renameFile: {
      title: "Rename",
      form: {
        baseDirectory: {
          label: "Base Directory：",
        },
        fileName: {
          label: "Rename：",
          hint: "Cannot start or end with / ， and there cannot be consecutive / in between",
        },
      },
      replaceConfirm: {
        description: "Has the file of the same name already covered?",
        yes: "Covered",
      },
    },

    deleteFiles: {
      title: "Delete Files",
      description: "The following file will be deleted",
    },

    copyFiles: {
      title: "Copy Files",
      description: "The following files will be ${operation} to the current directory（Overwrite if there are identical files or directories）",
      form: {
        fileName: {
          label: "Duplicate Name：",
          hint: "Cannot start or end with / ， and there cannot be consecutive / in between"
        },
      },
      replaceConfirm: {
        description: "Has the file of the same name already covered?",
        yes: "Covered",
      },
    },

    moveFiles: {
      title: "移动文件",
      description: "将${operation}以下文件到当前目录下（如有相同的文件或目录则覆盖）",
      form: {
        fileName: {
          label: "新的文件名：",
          hint: "不能以 / 开头或结尾，中间不能存在连续的 /"
        },
      },
      replaceConfirm: {
        description: "Has the file of the same name already covered?",
        yes: "Covered",
      },
    },

    changeFilesStorageClass: {
      title: "Change files storage class",
      description: "The storage type of the following directories or files will be updated",
    },

    changeFileStorageClass: {
      title: "Change file storage class",
    },

    restoreFiles: {
      title: "Restore Files",
      description: "The following directory or file will be restored：",
    },

    restoreFile: {
      title: "Restore File",
    },

    generateFileLinks: {
      title: "Export Download Links",
      description: "Download links to the following files will be exported",
      csvFile: {
        label: "Export file location：",
        suffix: "Open the location of the file",
      },
      selectLocalPathDialog: {
        title: "Select local path dialog",
      },
    },

    generateFileLink: {
      title: "Export Download Links",
    },

    uploadConfirm: {
      title: "Upload Files",
      previewList: {
        title: "The following files or directories are uploaded",
        more: "… total ${total} files/directories",
      },
      form: {
        isOverwrite: {
          label: "Overwrite：",
          hint: "（Only this time）",
        },
        storageClassKodoName: {
          label: "Storage Class：",
        },
      },
    },

    preview: {
      title: "Preview",
      back: "Go back to the preview",
      preCheck: {
        archived: {
          description: "Archive need to be restored in order to preview or download.",
          restore: "Restoring",
        },
        tooLarge: {
          noPreview: "The current file is too large（>${maxPreviewSize}），can not preview",
          previewWarning: "The current file is too large（>${maxPreviewSize}），so the preview may take longer to load and may incur corresponding traffic costs.",
          forcePreview: "Continue",
        },
      },
      content: {
        code: {
          showDiffView: "Save",
          saveContent: "Save confirmed",
        },
        others: {
          description: "Can not preview this file.",
          openAsText: "Try to open as a text file",
        }
      },
      error: {
        failedGenerateLink: "Failed to get preview link",
        failedGetContent: "Failed to get file contents",
        contentNotChanged: "The content is not modified",
      },
    },
    // end modals
  },
};

export default dict;
