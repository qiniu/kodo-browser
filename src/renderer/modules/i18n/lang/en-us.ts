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
    noObjectSelected: "No object selected",
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
    exportLink: "Export Download Link",
    exportLinks: "Export Download Links",
    restore: "Restore",
    changeStorageClass: "Set Storage Class",
  },

  top: {
    files: "Files",
    externalPath: "External Link",
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
    setBookmark: "Bookmark This Address",
    setBookmarkSuccess: "Saved bookmark successfully",
    deleteBookmark: "Remove This From Bookmarks",
    deleteBookmarkSuccess: "Remove bookmarks successfully",
  },

  signIn: {
    title: "access key sign in",
    accessKeyHistory: "AK History",
    form: {
      accessKeyId: {
        holder: "AccessKeyId",
        label: "AccessKeyId:",
        feedback: {
          required: "AccessKeyId is required",
        }
      },
      accessKeySecret: {
        holder: "AccessKeySecret",
        label: "AccessKeySecret:",
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
      createBucketButton: "Create Bucket",
      moreOperation: {
        toggleButton: "More",
        deleteBucketButton: "Delete",
      },
      search: {
        holder: "Bucket Name",
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
        nonOwnedDomain: "Non-owned domain",
        refreshTooltip: "Refresh",
      },
    },
    fileTable: {
      fileName: "Name",
      fileTypeOrSize: "Type/Size",
      fileStorageClass: "Storage Class",
      fileModifyDate: "Last Modify Date",
      fileOperation: "Actions",
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
        title: "Select upload files",
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
        label: "File Name:",
      },
      currentStorageClass: {
        label: "Current storage class:",
      },
      storageClassKodoName: {
        label: "Storage Class:",
      },
    },
    generateLink: {
      fileName: {
        label: "File Name:",
      },
      domainName: {
        label: "Domain Name:",
        nonOwnedDomain: "Non-owned domain name",
      },
      expireAfter: {
        label: "Validity period:",
        suffix: "Seconds",
      },
      fileLink: {
        label: "File Link:",
        copied: "Copied",
      },
    },
    restore: {
      frozen: {
        loading: "Checking file restore status",
        normal: "The file storage type does not need to be restored",
        unfreezing: "File is recovering, please be patient……",
        unfrozen: "The file is restored and does not need to be done again",
        unknown: "Unknown restored status",
      },
      fileName: {
        label: "File Name:",
      },
      days: {
        label: "Restore days:",
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
            pattern: "UC URL require start with http(s)://",
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
            pattern: "Endpoint require start with http(s)://",
          },
        },
      },
    },

    akHistory: {
      title: "AK History",
      removeAllButton: "Clear Histories",
      useAkButton: "Use",
      removeAkButton: "Remove",
      currentUser: "(current)",
      table: {
        endpoint: "Endpoint",
        accessKeyId: "AccessKeyId",
        accessKeySecret: "AccessKeySecret",
        description: "Description",
        operation: "Actions",
      },
    },

    releaseNote: {
      title: "Release Notes",
    },

    settings: {
      title: "Setting",
      saved: "Setting Saved",
      upload: {
        legend: "Upload",
        form: {
          resumeUpload: {
            label: "Multipart Upload:",
            hint: "(Enable multipart upload)",
          },
          multipartUploadThreshold: {
            label: "Multipart upload threshold:",
            hint: "Unit: MB, Range: 10 MB - 1000 MB",
          },
          multipartUploadPartSize: {
            label: "Multipart upload part size:",
            hint: "Unit: MB, Range: 8 MB - 100 MB",
          },
          maxUploadConcurrency: {
            label: "Maximum number of upload tasks:",
            hint: "Range: 1-10",
          },
          enabledUploadSpeedLimit: {
            label: "Upload speed limit:",
            hint: "(Enable upload speed limit)",
          },
          uploadSpeedLimit: {
            label: "Upload single file speed limit:",
            hint: "Unit：KB/s, Range：1 KB/s - 102400 KB/s",
          },
        },
      },
      download: {
        legend: "Download",
        form: {
          resumeDownload: {
            label: "Multipart Download:",
            hint: "(Enable multipart upload)",
          },
          multipartDownloadThreshold: {
            label: "Multipart download threshold:",
            hint: "Unit: MB, Range: 10 MB - 1000 MB",
          },
          multipartDownloadPartSize: {
            label: "Multipart download part size:",
            hint: "Unit: MB, Range: 8 MB - 100 MB",
          },
          maxDownloadConcurrency: {
            label: "Maximum number of download tasks:",
            hint: "Range: 1-10",
          },
          enabledDownloadSpeedLimit: {
            label: "Download speed limit:",
            hint: "(Enable download speed limit)",
          },
          downloadSpeedLimit: {
            label: "Download single file speed limit:",
            hint: "Unit: KB/s, Range: 1 KB/s - 102400 KB/s",
          },
        },
      },
      externalPath: {
        legend: "External Link",
        form: {
          enabled: {
            label: "External Link",
            hint: "(Enable External Link)"
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
            hint: "(Enable file list load more on touch end)",
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
        operation: "Actions",
      }
    },

    externalPathManager: {
      title: "External Path Manager",
      addButton: "Add",
      removeButton: "Remove",
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
        operation: "Actions",
      },
    },

    about: {
      title: "About",
      openSourceAddress: "Open Source: ",
      updateApp: {
        checking: "Checking new version……",
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
          label: "Name:",
          holder: "Bucket Name",
          tips: "Consists of 3 to 63 characters, can contain lowercase letters, numbers, and dashes, and must begin and end with a lowercase letter or number",
          feedback: {
            required: "Name Required",
            pattern: "Wrong Pattern",
          },
        },
        region: {
          label: "Region:",
          feedback: {
            required: "Must select a region",
          },
        },
        acl: {
          label: "ACL Permission:",
          options: {
            inherit: "Inherit From Bucket",
            publicReadWrite: "Public Read and Write",
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
      content: "Bucket Name：${bucketName},  Are you sure you want to delete this bucket？",
      submit: "Delete",
    },

    createDirectory: {
      title: "Create Directory",
      form: {
        directoryName: {
          label: "Directory Name:",
          hint: "Directory name cannot be included /",
        },
      },
    },

    renameFile: {
      title: "Rename",
      form: {
        baseDirectory: {
          label: "Directory:",
        },
        fileName: {
          label: "Rename:",
          hint: "Cannot start or end with / ,  and there cannot be consecutive / in between",
        },
      },
      replaceConfirm: {
        description: "Already has the same name file, replace?",
        yes: "Replace",
      },
    },

    deleteFiles: {
      title: "Delete Files",
      description: "Delete the following files or directories:",
    },

    copyFiles: {
      title: "Copy Files",
      description: "${operation} the following files or directories to current directory(The same name file or directory will be replaced):",
      form: {
        fileName: {
          label: "Duplicate Name:",
          hint: "Cannot start or end with / , and there cannot be consecutive / in between"
        },
      },
      replaceConfirm: {
        description: "Already has the same name file, replace?",
        yes: "Replace",
      },
    },

    moveFiles: {
      title: "Move Files",
      description: "${operation} the following files or directories to current directory(The same name file or directory will be replaced):",
      form: {
        fileName: {
          label: "New Name:",
          hint: "Cannot start or end with / , and there cannot be consecutive / in between"
        },
      },
      replaceConfirm: {
        description: "Already has the same name file, replace?",
        yes: "Replace",
      },
    },

    changeFilesStorageClass: {
      title: "Set Storage Class",
      description: "Set the storage class of the following files or directories:",
    },

    changeFileStorageClass: {
      title: "Set Storage Class",
    },

    restoreFiles: {
      title: "Restore Files",
      description: "Restore the following files or directories:",
    },

    restoreFile: {
      title: "Restore File",
    },

    generateFileLinks: {
      title: "Export Download Links",
      description: "Export download links of the following files:",
      csvFile: {
        label: "Export file location:",
        suffix: "Show File in Directory",
      },
      selectLocalPathDialog: {
        title: "Select Export Path",
        error: {
          cancelOrNoSelected: "canceled or not select any path to save",
        },
      },
    },

    generateFileLink: {
      title: "Export Download Link",
    },

    uploadConfirm: {
      title: "Upload Files",
      previewList: {
        title: "Upload the following files or directories:",
        more: "… total ${total} files/directories",
      },
      form: {
        isOverwrite: {
          label: "Overwrite:",
          hint: "(Only this time)",
        },
        storageClassKodoName: {
          label: "Storage Class:",
        },
      },
    },

    preview: {
      title: "Preview",
      back: "Back to Preview",
      preCheck: {
        archived: {
          description: "Archive need to be restored in order to preview or download.",
          restore: "Restoring",
        },
        tooLarge: {
          noPreview: "The current file is too large(>${maxPreviewSize}), can not preview",
          previewWarning: "The current file is too large(>${maxPreviewSize}), so the preview may take longer to load and may incur corresponding traffic costs.",
          forcePreview: "Continue",
        },
      },
      content: {
        code: {
          showDiffView: "Save",
          saveContent: "Upload",
        },
        others: {
          description: "Can not preview this file.",
          openAsText: "Try to open as a text file.",
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
