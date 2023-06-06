import Dictionary from "./dict";

const dict: Dictionary = {
    common: {
        kodoBrowser: "Kodo ブラウザ",
        empty: "現時点ではデータがありません",
        ok: "OK",
        cancel: "キャンセル",
        close: "クローズ",
        save: "保存",
        saving: "保存する",
        saved: "正常に保存",
        submit: "送信",
        submitting: "送信中",
        submitted: "正常に送信",
        loading: "正在载入",
        success: "成功",
        failed: "失敗",
        refresh: "更新",
        refreshing: "更新中",
        refreshed: "正常に更新",
        interrupt: "中断",
        retry: "リトライ",
        retrying: "リトライ中",
        notFound: "未発見",
        noObjectSelected: "操作可能なオブジェクトがない",
        noDomainToGet: "オブジェクトを取得するためのドメインがない",
        errored: "エラーが発生しました",
        paused: "停止しました",

        directory: "フォルダ",
        upload: "アップロード",
        download: "ダウンロード",
        downloading: "ダウンロード中",
        downloaded: "ダウンロードされました",
        copy: "コピー",
        move: "移動",
        paste: "貼り付けます",
        rename: "名前を変更",
        delete: "削除",
        more: "もっと",
        exportLink: "ダウンロードアドレスを取得する",
        exportLinks: "ダウンロードリンクのエクスポート",
        restore: "リストア",
        changeStorageClass: "ストレージクラスを設定する",
    },

    top: {
        files: "ファイル",
        externalPath: "外部リンク",
        settings: "設定",
        bookmarks: "ブックマーク",
        about: "について",
        language: "言語：",
        switchUser: "アカウントを切り替える",
        signOut: "ログアウト",
    },

    kodoAddressBar: {
        goBack: "後退",
        goForward: "進む",
        goUp: "上がる",
        refresh: "リフレッシュ",
        goHome: "ホーム",
        setHome: "ホームページを設定する",
        setHomeSuccess: "ホームページの設定は成功",
        setBookmark: "ブックマークに保存",
        setBookmarkSuccess: "ブックマークの追加は成功しました",
        deleteBookmark: "ブックマーク削除",
        deleteBookmarkSuccess: "ブックマークの削除は成功",
    },

    signIn: {
        title: "Access Key ログイン",
        accessKeyHistory: "AK の歴史",
        form: {
            accessKeyId: {
                holder: "AccessKeyId",
                label: "AccessKeyId：",
                feedback: {
                    required: "AccessKeyId 空にすることはできません",
                }
            },
            accessKeySecret: {
                holder: "AccessKeySecret",
                label: "AccessKeySecret：",
                feedback: {
                    required: "AccessKeySecret 空にすることはできません"
                },
            },
            endpoint: {
                label: "Endpoint：",
                options: {
                    public: "デフォルト (パブリッククラウド)",
                    private: "カスタム (プライベートクラウド)",
                }
            },
            description: {
                holder: "オプション、最大20単語",
                label: "説明：",
                feedback: {
                    maxLength: "最大20単語",
                },
            },
            rememberMe: {
                label: "覚えている",
                hint: "AKキーを保存するには、 「覚えている」ボタンをチェックします。ログインするときは、AK Historyをクリックしてログインするキーを選択します.AKを手動で入力する必要はありません。 一時的な使用のためにコンピュータをチェックしないでください！",
            },
            submit: "ログイン",
            submitting: "ログイン中",
        },
    },

    signOut: {
        title: "ログアウト中……",
    },

    switchUser: {
        title: "アカウントを切り替える中……",
        error: "アカウントの切り替えに失敗しました：",
    },

    browse: {
        bucketToolbar: {
            createBucketButton: "バケットの作成",
            moreOperation: {
                toggleButton: "さらに",
                deleteBucketButton: "削除",
            },
            search: {
                holder: "バケット名",
            },
        },
        bucketTable: {
            bucketGrantedReadOnly: "読み取り専用",
            bucketGrantedReadWrite: "読み書き",
            bucketName: "バケット名",
            bucketRegion: "地域名",
            createTime: "作成時間",
        },
        externalPathToolBar: {
            addExternalPath: "外部パス追加",
            search: {
                holder: "外部パス",
            },
        },
        externalPathTable: {
            path: "外部パス",
            regionName: "地域名",
        },
        fileToolbar: {
            createDirectory: "ディレクトリ",
            search: {
                holder: "名前プレフィックスをフィルタリングする",
            },
            domain: {
                nonOwnedDomain: "所有ドメイン名はありません",
                refreshTooltip: "リフレッシュ",
            },
        },
        fileTable: {
            fileName: "名前",
            fileTypeOrSize: "タイプ/サイズ",
            fileStorageClass: "保管タイプ",
            fileModifyDate: "最終更新日",
            fileOperation: "アクション",
            loadMore: "もっと読み込む...",
        },
        restoreStatus: {
            label: "解凍状態：",
            normal: "解凍する必要はありません",
            frozen: "凍結",
            unfreezing: "解凍中",
            unfrozen: "解凍されました",
        },
    },

    transfer: {
        jobItem: {
            pauseButton: "停止",
            startButton: "開始",
            removeButton: "削除",
            retryButton: "リトライ",
            retryWithOverwriteButton: "リトライ オーバーライト",
            status: {
                finished: "完了",
                failed: "失敗",
                stopped: "停止",
                waiting: "待っている",
                running: "ランニング",
                duplicated: "すでに存在",
                verifying: "検証中",
            },
            removeConfirmOk: "削除",
            unknownError: "不明なエラーです",
            fileDuplicated: "ファイルは既に存在",
        },
        upload: {
            dropZone: {
                enter: "Drag here to upload",
                over: "Release to upload",
            },
            dialog: {
                title: "[ファイルのアップロード] を選択",
            },
            hint: {
                addingJobs: "ダウンロードキューに追加中…",
                addedJobs: "すべて追加されました",
            },
            error: {
                nothing: "アップロードできるファイルは見つかりませんでした",
                duplicatedBasename: "選択したファイルやディレクトリの名前が重複している",
            },
            toolbar: {
                search: {
                    holder: "名前またはステータスによるフィルタリング",
                },
                emptyDirectorySwitch: "空のディレクトリのアップロードを許可/禁止する",
                startAllButton: "すべて開始",
                cleanupButton: "クリア完了",
                removeAllButton: "すべてクリア",
            },
            removeAllConfirm: {
                title: "すべてクリア",
                content: "すべてのアップロードタスクをクリアしますか？",
                ok: "削除",
                cancel: "キャンセル",
            },
        },
        download: {
            dialog: {
                title: "ダウンロード先を選択",
            },
            hint: {
                addingJobs: "ダウンロードキューに追加中…",
                addedJobs: "すべて追加されました",
            },
            toolbar: {
                search: {
                    holder: "名前またはステータスによるフィルタリング",
                },
                overwriteSwitch: "ダウンロードを上書きするかどうか",
                startAllButton: "すべて開始",
                cleanupButton: "クリア完了",
                removeAllButton: "すべてクリア",
            },
            removeAllConfirm: {
                title: "すべてクリア",
                content: "すべてのダウンロードタスクをクリアしてもよろしいですか？",
                ok: "削除",
                cancel: "キャンセル",
            },
        },
    },

    forms: {
        changeStorageClass: {
            fileName: {
                label: "ファイル：",
            },
            currentStorageClass: {
                label: "現在のストレージクラス：",
            },
            storageClassKodoName: {
                label: "着替える：",
            },
        },
        generateLink: {
            fileName: {
                label: "名前：",
            },
            domainName: {
                label: "ドメイン名：",
                nonOwnedDomain: "所有ドメイン名はありません",
                feedback: {
                    emptyFileNameByS3Hint: "空のファイル名と所有ドメイン名はありませんでは利用できません",
                },
            },
            expireAfter: {
                label: "有効期間：",
                suffix: "s",
                hint: "範囲 ${min}-${max}",
            },
            fileLink: {
                label: "ファイル リンク：",
                copied: "もうクリップボードにコピー",
            },
            errors: {
                domainNotFound: "選択されたドメインが見つかりません",
            }
        },
        restore: {
            frozen: {
                loading: "ファイル復元ステータスの確認",
                normal: "ファイルストレージタイプを復元する必要はありません",
                unfreezing: "アーカイブファイルが回復しています、しばらくお待ちください",
                unfrozen: "アーカイブが復元されました、再度実行する必要はありません",
                unknown: "不明な復元ステータス",
            },
            fileName: {
                label: "名前：",
            },
            days: {
                label: "日々：",
            },
        },
    },

    modals: {
        privateCloudSettings: {
            title: "地域設定",
            region: "地域",
            appendRegionButton: "地域を追加",
            removeRegionButton: "削除",
            form: {
                ucUrl: {
                    label: "UC サービス：",
                    holder: "UC サービスの URL を入力してください",
                    feedback: {
                        required: "UC サービス URL を入力する必要があります",
                        pattern: "UC サービス URL は http(s):// で始まる必要があります",
                    }
                },
                regionIdentifier: {
                    label: "地域 ID：",
                    holder: "地域 ID を入力してください",
                    feedback: {
                        required: "地域 ID を入力する必要があります",
                    },
                },
                regionName: {
                    label: "地域名：",
                    holder: "地域名を入力してください",
                },
                regionEndpoint: {
                    label: "Endpoint：",
                    holder: "Endpoint を入力してください",
                    feedback: {
                        required: "Endpoint を入力する必要があります",
                        pattern: "Endpoint は http(s):// で始まる必要があります"
                    },
                },
            },
        },

        akHistory: {
            title: "AKの歴史",
            removeAllButton: "AK履歴削除",
            useAkButton: "利用",
            removeAkButton: "削除",
            currentUser: "（利用中）",
            table: {
                endpoint: "Endpoint",
                accessKeyId: "AccessKeyId",
                accessKeySecret: "AccessKeySecret",
                description: "説明",
                operation: "アクション",
            },
        },

        releaseNote: {
            title: "リリースノート",
        },

        settings: {
            title: "設定",
            saved: "設定が保存されました",
            upload: {
                legend: "アップロード",
                form: {
                    resumeUpload: {
                        label: "断点アップロード：",
                        hint: "（断点アップロードを有効にする）",
                    },
                    multipartUploadThreshold: {
                        label: "断点アップロードファイル閾値：",
                        hint: "単位：MB，範囲：10 MB - 1000 MB",
                    },
                    multipartUploadPartSize: {
                        label: "シ断点アップロードスライスサイズ：",
                        hint: "単位：MB，範囲：8 MB - 100 MB",
                    },
                    maxUploadConcurrency: {
                        label: "アップロードの最大同時処理数：",
                        hint: "範囲：1-10",
                    },
                    enabledUploadSpeedLimit: {
                        label: "アップロード速度制限：",
                        hint: "（アップロード速度制限を有効にする）",
                    },
                    uploadSpeedLimit: {
                        label: "単一のファイル速度制限をアップロードする：",
                        hint: "単位：KB/s，範囲：1 KB/s - 102400 KB/s",
                    },
                },
            },
            download: {
                legend: "ダウンロード",
                form: {
                    resumeDownload: {
                        label: "断点ダウンロード：",
                        hint: "（断点ダウンロードを有効にする）",
                    },
                    multipartDownloadThreshold: {
                        label: "断点ダウンロードファイル閾値：",
                        hint: "単位：MB，範囲：10 MB - 1000 MB",
                    },
                    multipartDownloadPartSize: {
                        label: "断点ダウンロードスライスサイズ：",
                        hint: "単位：MB，範囲：8 MB - 100 MB",
                    },
                    maxDownloadConcurrency: {
                        label: "ダウンロードの最大同時処理数：",
                        hint: "範囲：1-10",
                    },
                    enabledDownloadSpeedLimit: {
                        label: "ダウンロード速度制限：",
                        hint: "（ダウンロード速度制限を有効にする）",
                    },
                    downloadSpeedLimit: {
                        label: "単一のファイル速度制限をダウンロードする：",
                        hint: "単位：KB/s，範囲：1 KB/s - 102400 KB/s",
                    },
                },
            },
            externalPath: {
                legend: "外部リンク",
                form: {
                    enabled: {
                        label: "外部リンク：",
                        hint: "（外部リンクを有効にする）"
                    },
                },
            },
            others: {
                legend: "システム設定",
                form: {
                    isDebug: {
                        label: "デバッグログ：",
                        hint: "デバッグログを開くかどうか",
                    },
                    enabledLoadFilesOnTouchEnd: {
                        label: "ステップごとのファイルリストのロード：",
                        hint: "（ステップバイステップモードでファイルリストの読み込みを有効にする）",
                    },
                    loadFilesNumberPerPage: {
                        label: "一度にロードされるファイルの数：",
                        hint: "範囲：10-1000",
                    },
                    autoUpgrade: {
                        label: "自動更新：",
                        hint: "自動ダウンロードパッケージ",
                    },
                    language: {
                        label: "言語：",
                    },
                },
            },
        },

        bookmarkManager: {
            title: "ブックマーク",
            removeBookmarkButton: "削除",
            table: {
                url: "URL",
                createTime: "作成時間",
                operation: "アクション",
            }
        },

        about: {
            title: "について",
            openSourceAddress: "オープンソース：",
            updateApp: {
                checking: "新しいバージョンを確認しています……",
                alreadyLatest: "既に最新バージョンです！",
                foundLatest: "新しいバージョンを見つけました",
                changeLogsTitle: "リリースノート：",
                downloadManually: "手動ダウンロード",
                operationButton: {
                    start: "更新を開始",
                    resume: "ダウンロードを続行",
                    pause: "一時停止ダウンロード",
                    showItemInDir: "ファイルエクスプローラーでの表示",
                },
            },
        },

        createBucket: {
            title: "バケットの作成",
            form: {
                bucketName: {
                    label: "名前：",
                    holder: "バケット名",
                    tips: "3〜63文字で構成され、小文字、数字、ダッシュを含めることができ、小文字または数字で開始および終了する必要があります",
                    feedback: {
                        required: "名前を入力する必要があります",
                        pattern: "形式が正しくありません",
                    },
                },
                region: {
                    label: "地域：",
                    feedback: {
                        required: "ゾーンを選択する必要があります",
                    },
                },
                acl: {
                    label: "ACL：",
                    options: {
                        inherit: "バケツからの継承",
                        publicReadWrite: "公開可読は書く",
                        publicRead: "公開読み取っ",
                        private: "非公開",
                    },
                    feedback: {
                        required: "ACL アクセス許可を選択する必要があります",
                    },
                },
            },
        },

        deleteBucket: {
            title: "Bucket 削除",
            content: "Bucket バケット名：${bucketName}，このバケットを削除してもよろしいですか？",
            submit: "削除",
        },

        addExternalPath: {
            title: "外部パス追加",
            submit: "追加",
            form: {
                region: {
                    label: "地域：",
                    feedback: {
                        required: "地域選択する必要があります",
                    }
                },
                path: {
                    label: "外部パス：",
                    holder: "Bucket/Object-Prefix",
                    feedback: {
                        required: "パスを入力する必要があります",
                    },
                    hint: "付与者から提供されたバケットポリシーを通じて許可されたバケットまたはバケットの下のパスを入力します",
                },
            },
            error: {
                duplicated: "パスは既に存在",
            },
        },

        deleteExternalPath: {
            title: "外部パス削除",
            content: "外部パス：${externalPathUrl}，地域：${regionName}，この外部パスを削除してもよろしいですか？",
            submit: "削除",
        },

        createDirectory: {
            title: "ディレクトリ",
            form: {
                directoryName: {
                    label: "名前：",
                    hint: "ディレクトリ名に / を含めることはできません。",
                },
            },
        },

        renameFile: {
            title: "名前を変更する",
            form: {
                baseDirectory: {
                    label: "フォルダ：",
                },
                fileName: {
                    label: "名前を変更する：",
                    hint: "/ で始まるか、または終了することはできません、 中間に連続 /",
                },
            },
            replaceConfirm: {
                description: "同じ名前のファイルは既にカバーされていますか？",
                yes: "OK",
            },
        },

        deleteFiles: {
            title: "ファイルを削除",
            description: "次のディレクトリまたはファイルが削除されます：",
        },

        copyFiles: {
            title: "ファイルをコピー",
            hintFiltered: "自分自身へや空のファイル名のディレクトリのコピーの禁止，一部の無効な項目を除去。",
            description: "このディレクトリに${operation}  (同じファイルまたはディレクトリが対象となります)",
            form: {
                fileName: {
                    label: "コピー ファイル名：",
                    hint: "/ で始まるか、または終了することはできません、 中間に連続 /"
                },
            },
            replaceConfirm: {
                description: "同じ名前のファイルは既にカバーされていますか？",
                yes: "OK",
            },
        },

        moveFiles: {
            title: "ファイルを移動",
            hintFiltered: "自分自身へや空のファイル名のディレクトリの移動の禁止，一部の無効な項目を除去。",
            description: "このディレクトリに${operation}  (同じファイルまたはディレクトリが対象となります)",
            form: {
                fileName: {
                    label: "新しいファイル名：",
                    hint: "/ で始まるか、または終了することはできません、 中間に連続 /"
                },
            },
            replaceConfirm: {
                description: "同じ名前のファイルは既にカバーされていますか？",
                yes: "OK",
            },
        },

        changeFilesStorageClass: {
            title: "ストレージクラスを設定する",
            description: "以下のディレクトリまたはファイルが更新されます",
        },

        changeFileStorageClass: {
            title: "ストレージクラスを設定する",
        },

        restoreFiles: {
            title: "リストア",
            description: "次のディレクトリまたはファイルがフリーズ解除されます：",
        },

        restoreFile: {
            title: "リストア",
        },

        generateFileLinks: {
            title: "ダウンロードリンクのエクスポート",
            description: "次のファイルの外部チェーンがエクスポートされます",
            hintFiltered: "ファイル名が空のファイルのリンクをエクスポートできない，一部の無効な項目を除去。",
            csvFile: {
                label: "ファイルの場所をエクスポート：",
                suffix: "ファイルエクスプローラーでの表示",
            },
            selectLocalPathDialog: {
                title: "エクスポート先を選択",
                error: {
                    cancelOrNoSelected: "キャンセル、保存場所が選択されていない",
                },
            },
        },

        generateFileLink: {
            title: "ダウンロードリンクのエクスポート",
        },

        uploadConfirm: {
            title: "ファイルのアップロード",
            previewList: {
                title: "ファイルやディレクトリの選択",
                more: "… 合計 ${total} 個のファイル/ディレクトリ",
            },
            form: {
                isOverwrite: {
                    label: "上書き：",
                    hint: "（今回の上書き）",
                },
                storageClassKodoName: {
                    label: "保管タイプ：",
                },
            },
        },

        preview: {
            title: "プレビュー",
            back: "プレビューに戻ります",
            preCheck: {
                archived: {
                    description: "プレビューまたはダウンロードするためにアーカイブを復元する必要があります。",
                    restore: "リストア",
                },
                tooLarge: {
                    noPreview: "現在のファイルが大きすぎる（>${maxPreviewSize}），プレビューできません",
                    previewWarning: "現在のファイルが大きすぎる（>${maxPreviewSize}），プレビューの読み込みに時間がかかる場合があり、対応するトラフィック料金が発生する場合があります。",
                    forcePreview: "続く",
                },
            },
            content: {
                code: {
                    showDiffView: "セーブ",
                    saveContent: "保存を確認",
                },
                others: {
                    description: "このファイルをプレビューできません。",
                    openAsText: "テキストで開きます",
                }
            },
            error: {
                emptyFileNameByS3Hint: "空のファイル名と所有ドメイン名はありませんでは利用できません",
                failedGenerateLink: "プレビュー リンクの取得に失敗しました",
                failedGetContent: "ファイルの内容の取得に失敗しました",
                contentNotChanged: "内容は修正していません",
            },
        },
        // end modals
    },
};

export default dict;
