jest.mock("electron", () => ({
    __esModule: true,
    ipcRenderer: {
        on: jest.fn(),
        send: jest.fn(),
        removeListener: jest.fn(),
    }
}));

import {ipcRenderer} from "electron";
import {UploadAction} from "@common/ipc-actions/upload";
import {DownloadAction} from "@common/ipc-actions/download";
import ByteSize from "@common/const/byte-size";
import {LangName} from "@renderer/modules/i18n";

import Settings, {ContentViewStyle, SettingKey, SettingStorageKey} from "./index";

// WARNING: The getter tests in "no data in storage" section is
//          for testing default value.
//          If changed the default value, you should change all
//          tests using default value.
//          Especially need change `MOCK_LOCALSTORAGE_DATA` in
//          "some data in storage" section to make sure using
//          a different value from default.
//          That ensure the `MOCK_LOCALSTORAGE_DATA` and others
//          is still working.

describe("test settings.ts", () => {
    describe("enum SettingKey", () => {
        it("enum is MECE", () => {
            const EXPECT_KES = [
                "isDebug",
                "autoUpgrade",
                "resumeUpload",
                "maxUploadConcurrency",
                "multipartUploadSize",
                "multipartUploadThreshold",
                "uploadSpeedLimitEnabled",
                "uploadSpeedLimit",
                "empty-folder-uploading",
                "resumeDownload",
                "maxDownloadConcurrency",
                "multipartDownloadSize",
                "multipartDownloadThreshold",
                "downloadSpeedLimitEnabled",
                "downloadSpeedLimit",
                "overwrite-downloading",
                "externalPathEnabled",
                "stepByStepLoadingFiles",
                "filesLoadingSize",
                "navHistoriesLength",
                "lang",
                "is-list-view",
            ];
            const ACTUAL_KEY_LIST = Object.values(SettingStorageKey);
            for (const expectKey of EXPECT_KES) {
                const actualKey = ACTUAL_KEY_LIST.find(k => k === expectKey);
                expect(actualKey).toEqual(expectKey);
            }
            for (const actualKey of ACTUAL_KEY_LIST) {
                const expectKey = EXPECT_KES.find(k => k === actualKey);
                expect(actualKey).toEqual(expectKey);
            }
        });

        it("class Settings is MECE", () => {
            const EXPECT_PROPERTIES = [
                "isDebug",
                "autoUpgrade",
                "resumeUpload",
                "maxUploadConcurrency",
                "multipartUploadSize",
                "multipartUploadThreshold",
                "uploadSpeedLimitEnabled",
                "uploadSpeedLimitKbPerSec",
                "skipEmptyDirectoryUpload",
                "resumeDownload",
                "maxDownloadConcurrency",
                "multipartDownloadSize",
                "multipartDownloadThreshold",
                "downloadSpeedLimitEnabled",
                "downloadSpeedLimitKbPerSec",
                "overwriteDownload",
                "externalPathEnabled",
                "stepByStepLoadingFiles",
                "filesLoadingSize",
                "historiesLength",
                "language",
                "contentViewStyle",
            ];
            const settingsProto = Reflect.getPrototypeOf(Settings);
            if (settingsProto === null){
                fail("can not get Settings proto");
                return
            }
            const ACTUAL_PROPERTIES = Reflect.ownKeys(settingsProto)
                .filter(name =>
                  ![
                      "constructor",
                      "onChange",
                      "offChange",
                      "trigger"
                  ].some(n => n === name)
                );
            for (const expectProperty of EXPECT_PROPERTIES) {
                const actualProperty = ACTUAL_PROPERTIES.find(p => p === expectProperty);
                expect(actualProperty).toEqual(expectProperty);
            }
            for (const actualProperty of ACTUAL_PROPERTIES) {
                const expectProperty = EXPECT_PROPERTIES.find(p => p === actualProperty);
                expect(actualProperty).toEqual(expectProperty);
            }
            for (const key of Object.values(SettingKey)) {
                const expectProperty = EXPECT_PROPERTIES.find(p => p === key);
                expect(key).toEqual(expectProperty);
            }
        });
    });

    describe("no data in storage", () => {
        beforeEach(() => {
            localStorage.clear();
        });
        // isDebug
        it("isDebug getter", () => {
            expect(Settings.isDebug).toBe(0);
        });
        it("isDebug setter", () => {
            Settings.isDebug = 1;
            expect(Settings.isDebug).toBe(1);
            expect(ipcRenderer.send).toHaveBeenCalledWith(
                "UploaderManager",
                {
                    action: UploadAction.UpdateConfig,
                    data: {
                        isDebug: true,
                    },
                },
            );
            expect(ipcRenderer.send).toHaveBeenCalledWith(
                "DownloaderManager",
                {
                    action: DownloadAction.UpdateConfig,
                    data: {
                        isDebug: true,
                    },
                },
            );
            Settings.isDebug = 0;
            expect(Settings.isDebug).toBe(0);
            expect(ipcRenderer.send).toHaveBeenCalledWith(
                "UploaderManager",
                {
                    action: UploadAction.UpdateConfig,
                    data: {
                        isDebug: false,
                    },
                },
            );
            expect(ipcRenderer.send).toHaveBeenCalledWith(
                "DownloaderManager",
                {
                    action: DownloadAction.UpdateConfig,
                    data: {
                        isDebug: false,
                    },
                },
            );
        });

        // autoUpgrade
        it("autoUpgrade getter", () => {
            expect(Settings.autoUpgrade).toBe(0);
        });
        it("autoUpgrade setter", () => {
            Settings.autoUpgrade = 1;
            expect(Settings.autoUpgrade).toBe(1);
            Settings.autoUpgrade = 0;
            expect(Settings.autoUpgrade).toBe(0);
        });

        // resumeUpload
        it("resumeUpload getter", () => {
            expect(Settings.resumeUpload).toBe(0);
        });
        it("resumeUpload setter", () => {
            Settings.resumeUpload = 1;
            expect(Settings.resumeUpload).toBe(1);
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "UploaderManager",
                {
                    action: UploadAction.UpdateConfig,
                    data: {
                        resumable: true,
                    },
                },
            );
            Settings.resumeUpload = 0;
            expect(Settings.resumeUpload).toBe(0);
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "UploaderManager",
                {
                    action: UploadAction.UpdateConfig,
                    data: {
                        resumable: false,
                    },
                },
            );
        });

        // maxUploadConcurrency
        it("maxUploadConcurrency getter", () => {
            expect(Settings.maxUploadConcurrency).toBe(1);
        });
        it("maxUploadConcurrency setter", () => {
            Settings.maxUploadConcurrency = 2;
            expect(Settings.maxUploadConcurrency).toBe(2);
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "UploaderManager",
                {
                    action: UploadAction.UpdateConfig,
                    data: {
                        maxConcurrency: 2,
                    },
                },
            );
            Settings.maxUploadConcurrency = 1;
            expect(Settings.maxUploadConcurrency).toBe(1);
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "UploaderManager",
                {
                    action: UploadAction.UpdateConfig,
                    data: {
                        maxConcurrency: 1,
                    },
                },
            );
        });

        // multipartUploadSize
        it("multipartUploadSize getter", () => {
            expect(Settings.multipartUploadSize).toBe(8);
        });
        it("multipartUploadSize setter valid", () => {
            Settings.multipartUploadSize = 10;
            expect(Settings.multipartUploadSize).toBe(10);
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "UploaderManager",
                {
                    action: UploadAction.UpdateConfig,
                    data: {
                        multipartSize: 10 * ByteSize.MB,
                    },
                },
            );
            Settings.multipartUploadSize = 8;
            expect(Settings.multipartUploadSize).toBe(8);
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "UploaderManager",
                {
                    action: UploadAction.UpdateConfig,
                    data: {
                        multipartSize: 8 * ByteSize.MB,
                    },
                },
            );
        });
        it("multipartUploadSize setter invalid", () => {
            Settings.multipartUploadSize = 0;
            expect(Settings.multipartUploadSize).toBe(8);
            Settings.multipartUploadSize = 1025;
            expect(Settings.multipartUploadSize).toBe(8);
        });

        // multipartUploadThreshold
        it("multipartUploadThreshold getter", () => {
            expect(Settings.multipartUploadThreshold).toBe(100);
        });
        it("multipartUploadThreshold setter", () => {
            Settings.multipartUploadThreshold = 110;
            expect(Settings.multipartUploadThreshold).toBe(110);
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "UploaderManager",
                {
                    action: UploadAction.UpdateConfig,
                    data: {
                        multipartThreshold: 110 * ByteSize.MB,
                    },
                },
            );
            Settings.multipartUploadThreshold = 100;
            expect(Settings.multipartUploadThreshold).toBe(100);
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "UploaderManager",
                {
                    action: UploadAction.UpdateConfig,
                    data: {
                        multipartThreshold: 100 * ByteSize.MB,
                    },
                },
            );
        });

        // uploadSpeedLimitEnabled
        it("uploadSpeedLimitEnabled getter", () => {
            expect(Settings.uploadSpeedLimitEnabled).toBe(0);
        });
        it("uploadSpeedLimitEnabled setter", () => {
            Settings.uploadSpeedLimitEnabled = 1;
            expect(Settings.uploadSpeedLimitEnabled).toBe(1);
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "UploaderManager",
                {
                    action: UploadAction.UpdateConfig,
                    data: {
                        speedLimit: Settings.uploadSpeedLimitKbPerSec * ByteSize.KB,
                    },
                },
            );
            Settings.uploadSpeedLimitEnabled = 0;
            expect(Settings.uploadSpeedLimitEnabled).toBe(0);
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "UploaderManager",
                {
                    action: UploadAction.UpdateConfig,
                    data: {
                        speedLimit: 0,
                    },
                },
            );
        });

        // uploadSpeedLimitKbPerSec
        it("uploadSpeedLimitKbPerSec getter", () => {
            expect(Settings.uploadSpeedLimitKbPerSec).toBe(1024);
        });
        it("uploadSpeedLimitKbPerSec setter", () => {
            Settings.uploadSpeedLimitEnabled = 1;
            Settings.uploadSpeedLimitKbPerSec = 2048;
            expect(Settings.uploadSpeedLimitKbPerSec).toBe(2048);
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "UploaderManager",
                {
                    action: UploadAction.UpdateConfig,
                    data: {
                        speedLimit: 2048 * ByteSize.KB,
                    },
                },
            );
            Settings.uploadSpeedLimitKbPerSec = 1024;
            expect(Settings.uploadSpeedLimitKbPerSec).toBe(1024);
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "UploaderManager",
                {
                    action: UploadAction.UpdateConfig,
                    data: {
                        speedLimit: 1024 * ByteSize.KB,
                    },
                },
            );
        });

        // skipEmptyDirectoryUpload
        it("skipEmptyDirectoryUpload getter", () => {
            expect(Settings.skipEmptyDirectoryUpload).toBeFalsy();
        });
        it("skipEmptyDirectoryUpload setter", () => {
            Settings.skipEmptyDirectoryUpload = true;
            expect(Settings.skipEmptyDirectoryUpload).toBeTruthy();
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "UploaderManager",
                {
                    action: UploadAction.UpdateConfig,
                    data: {
                        isSkipEmptyDirectory: true,
                    },
                },
            );
            Settings.skipEmptyDirectoryUpload = false;
            expect(Settings.skipEmptyDirectoryUpload).toBeFalsy();
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "UploaderManager",
                {
                    action: UploadAction.UpdateConfig,
                    data: {
                        isSkipEmptyDirectory: false,
                    },
                },
            );
        });

        // resumeDownload
        it("resumeDownload getter", () => {
            expect(Settings.resumeDownload).toBe(0);
        });
        it("resumeDownload setter", () => {
            Settings.resumeDownload = 1;
            expect(Settings.resumeDownload).toBe(1);
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "DownloaderManager",
                {
                    action: DownloadAction.UpdateConfig,
                    data: {
                        resumable: true,
                    },
                },
            );
            Settings.resumeDownload = 0;
            expect(Settings.resumeDownload).toBe(0);
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "DownloaderManager",
                {
                    action: DownloadAction.UpdateConfig,
                    data: {
                        resumable: false,
                    },
                },
            );
        });

        // maxDownloadConcurrency
        it("maxDownloadConcurrency getter", () => {
            expect(Settings.maxDownloadConcurrency).toBe(1);
        });
        it("maxDownloadConcurrency setter", () => {
            Settings.maxDownloadConcurrency = 2;
            expect(Settings.maxDownloadConcurrency).toBe(2);
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "DownloaderManager",
                {
                    action: DownloadAction.UpdateConfig,
                    data: {
                        maxConcurrency: 2,
                    },
                },
            );
            Settings.maxDownloadConcurrency = 1;
            expect(Settings.maxDownloadConcurrency).toBe(1);
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "DownloaderManager",
                {
                    action: DownloadAction.UpdateConfig,
                    data: {
                        maxConcurrency: 1,
                    },
                },
            );
        });

        // multipartDownloadSize
        it("multipartDownloadSize getter", () => {
            expect(Settings.multipartDownloadSize).toBe(8);
        });
        it("multipartDownloadSize setter", () => {
            Settings.multipartDownloadSize = 4;
            expect(Settings.multipartDownloadSize).toBe(4);
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "DownloaderManager",
                {
                    action: DownloadAction.UpdateConfig,
                    data: {
                        multipartSize: 4 * ByteSize.MB,
                    },
                },
            );
            Settings.multipartDownloadSize = 8;
            expect(Settings.multipartDownloadSize).toBe(8);
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "DownloaderManager",
                {
                    action: DownloadAction.UpdateConfig,
                    data: {
                        multipartSize: 8 * ByteSize.MB,
                    },
                },
            );
        });

        // multipartDownloadThreshold
        it("multipartDownloadThreshold getter", () => {
            expect(Settings.multipartDownloadThreshold).toBe(100);
        });
        it("multipartDownloadThreshold setter", () => {
            Settings.multipartDownloadThreshold = 110;
            expect(Settings.multipartDownloadThreshold).toBe(110);
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "DownloaderManager",
                {
                    action: DownloadAction.UpdateConfig,
                    data: {
                        multipartThreshold: 110 * ByteSize.MB,
                    },
                },
            );
            Settings.multipartDownloadThreshold = 100;
            expect(Settings.multipartDownloadThreshold).toBe(100);
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "DownloaderManager",
                {
                    action: DownloadAction.UpdateConfig,
                    data: {
                        multipartThreshold: 100 * ByteSize.MB,
                    },
                },
            );
        });

        // downloadSpeedLimitEnabled
        it("downloadSpeedLimitEnabled getter", () => {
            expect(Settings.downloadSpeedLimitEnabled).toBe(0);
        });
        it("downloadSpeedLimitEnabled setter", () => {
            Settings.downloadSpeedLimitEnabled = 1;
            expect(Settings.downloadSpeedLimitEnabled).toBe(1);
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "DownloaderManager",
                {
                    action: DownloadAction.UpdateConfig,
                    data: {
                        speedLimit: Settings.uploadSpeedLimitKbPerSec * ByteSize.KB,
                    },
                },
            );
            Settings.downloadSpeedLimitEnabled = 0;
            expect(Settings.downloadSpeedLimitEnabled).toBe(0);
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "DownloaderManager",
                {
                    action: DownloadAction.UpdateConfig,
                    data: {
                        speedLimit: 0,
                    },
                },
            );
        });

        // downloadSpeedLimitKbPerSec
        it("downloadSpeedLimitKbPerSec getter", () => {
            expect(Settings.downloadSpeedLimitKbPerSec).toBe(1024);
        });
        it("downloadSpeedLimitKbPerSec setter", () => {
            Settings.downloadSpeedLimitEnabled = 1;
            Settings.downloadSpeedLimitKbPerSec = 2048;
            expect(Settings.downloadSpeedLimitKbPerSec).toBe(2048);
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "DownloaderManager",
                {
                    action: DownloadAction.UpdateConfig,
                    data: {
                        speedLimit: 2048 * ByteSize.KB,
                    },
                },
            );
            Settings.downloadSpeedLimitKbPerSec = 1024;
            expect(Settings.downloadSpeedLimitKbPerSec).toBe(1024);
            expect(ipcRenderer.send).toHaveBeenLastCalledWith(
                "DownloaderManager",
                {
                    action: DownloadAction.UpdateConfig,
                    data: {
                        speedLimit: 1024 * ByteSize.KB,
                    },
                },
            );
        });


      // skipEmptyDirectoryUpload
      it("overwriteDownload getter", () => {
          expect(Settings.overwriteDownload).toBeFalsy();
      });
      it("overwriteDownload setter", () => {
          Settings.overwriteDownload = true;
          expect(Settings.overwriteDownload).toBeTruthy();
          expect(ipcRenderer.send).toHaveBeenLastCalledWith(
              "DownloaderManager",
              {
                  action: UploadAction.UpdateConfig,
                  data: {
                      isOverwrite: true,
                  },
              },
          );
          Settings.overwriteDownload = false;
          expect(Settings.overwriteDownload).toBeFalsy();
          expect(ipcRenderer.send).toHaveBeenLastCalledWith(
              "DownloaderManager",
              {
                  action: UploadAction.UpdateConfig,
                  data: {
                      isOverwrite: false,
                  },
              },
          );
      });

        // externalPathEnabled
        it("externalPathEnabled getter", () => {
            expect(Settings.externalPathEnabled).toBe(0);
        });
        it("externalPathEnabled setter", () => {
            Settings.externalPathEnabled = 1;
            expect(Settings.externalPathEnabled).toBe(1);
            Settings.externalPathEnabled = 0;
            expect(Settings.externalPathEnabled).toBe(0);
        });

        // stepByStepLoadingFiles
        it("stepByStepLoadingFiles getter", () => {
            expect(Settings.stepByStepLoadingFiles).toBe(1);
        });
        it("stepByStepLoadingFiles setter", () => {
            Settings.stepByStepLoadingFiles = 0;
            expect(Settings.stepByStepLoadingFiles).toBe(0);
            Settings.stepByStepLoadingFiles = 1;
            expect(Settings.stepByStepLoadingFiles).toBe(1);
        });

        // filesLoadingSize
        it("filesLoadingSize getter", () => {
            expect(Settings.filesLoadingSize).toBe(500);
        });
        it("filesLoadingSize setter", () => {
            Settings.filesLoadingSize = 600;
            expect(Settings.filesLoadingSize).toBe(600);
            Settings.filesLoadingSize = 500;
            expect(Settings.filesLoadingSize).toBe(500);
        });

        // historiesLength
        it("historiesLength getter", () => {
            expect(Settings.historiesLength).toBe(100);
        });
        it("historiesLength setter", () => {
            Settings.historiesLength = 110;
            expect(Settings.historiesLength).toBe(110);
            Settings.historiesLength = 100;
            expect(Settings.historiesLength).toBe(100);
        });

        // language
        it("language getter", () => {
            expect(Settings.language).toBe(LangName.ZH_CN);
        });
        it("language setter", () => {
            Settings.language = LangName.EN_US;
            expect(Settings.language).toBe(LangName.EN_US);
        });

        // content view style
        it("content view style", () => {
            expect(Settings.contentViewStyle).toBe(ContentViewStyle.Table);
        });
        it("content view style", () => {
            Settings.contentViewStyle = ContentViewStyle.Grid;
            expect(Settings.contentViewStyle).toBe(ContentViewStyle.Grid);
        });
    });

    describe("some data in storage", () => {
        beforeEach(() => {
            const MOCK_LOCALSTORAGE_DATA = {
                isDebug: "1",
                autoUpgrade: "1",
                resumeUpload: "1",
                maxUploadConcurrency: "2",
                multipartUploadSize: "4",
                multipartUploadThreshold: "110",
                uploadSpeedLimitEnabled: "1",
                uploadSpeedLimit: "2048",
                "empty-folder-uploading": "false",
                resumeDownload: "1",
                maxDownloadConcurrency: "2",
                multipartDownloadSize: "4",
                multipartDownloadThreshold: "110",
                downloadSpeedLimitEnabled: "1",
                downloadSpeedLimit: "2048",
                "overwrite-downloading": "true",
                externalPathEnabled: "1",
                stepByStepLoadingFiles: "0",
                filesLoadingSize: "600",
                navHistoriesLength: "110",
                lang: "en-US",
                "is-list-view": "false",
            };

            for (const [key, value] of Object.entries(MOCK_LOCALSTORAGE_DATA)) {
                localStorage.setItem(key, value)
            }
        });
        afterEach(() => {
            localStorage.clear();
        })

        // isDebug
        it("isDebug getter", () => {
            expect(Settings.isDebug).toBe(1);
        });
        it("isDebug setter", () => {
            Settings.isDebug = 0;
            expect(Settings.isDebug).toBe(0);
            Settings.isDebug = 1;
            expect(Settings.isDebug).toBe(1);
        });

        // autoUpgrade
        it("autoUpgrade getter", () => {
            expect(Settings.autoUpgrade).toBe(1);
        });
        it("autoUpgrade setter", () => {
            Settings.autoUpgrade = 0;
            expect(Settings.autoUpgrade).toBe(0);
            Settings.autoUpgrade = 1;
            expect(Settings.autoUpgrade).toBe(1);
        });

        // resumeUpload
        it("resumeUpload getter", () => {
            expect(Settings.resumeUpload).toBe(1);
        });
        it("resumeUpload setter", () => {
            Settings.resumeUpload = 0;
            expect(Settings.resumeUpload).toBe(0);
            Settings.resumeUpload = 1;
            expect(Settings.resumeUpload).toBe(1);
        });

        // maxUploadConcurrency
        it("maxUploadConcurrency getter", () => {
            expect(Settings.maxUploadConcurrency).toBe(2);
        });
        it("maxUploadConcurrency setter", () => {
            Settings.maxUploadConcurrency = 1;
            expect(Settings.maxUploadConcurrency).toBe(1);
            Settings.maxUploadConcurrency = 2;
            expect(Settings.maxUploadConcurrency).toBe(2);
        });

        // multipartUploadSize
        it("multipartUploadSize getter", () => {
            expect(Settings.multipartUploadSize).toBe(4);
        });
        it("multipartUploadSize setter valid", () => {
            Settings.multipartUploadSize = 8;
            expect(Settings.multipartUploadSize).toBe(8);
            Settings.multipartUploadSize = 10;
            expect(Settings.multipartUploadSize).toBe(10);
        });
        it("multipartUploadSize setter invalid", () => {
            Settings.multipartUploadSize = 0;
            expect(Settings.multipartUploadSize).toBe(4);
            Settings.multipartUploadSize = 1025;
            expect(Settings.multipartUploadSize).toBe(4);
        });

        // multipartUploadThreshold
        it("multipartUploadThreshold getter", () => {
            expect(Settings.multipartUploadThreshold).toBe(110);
        });
        it("multipartUploadThreshold setter", () => {
            Settings.multipartUploadThreshold = 110;
            expect(Settings.multipartUploadThreshold).toBe(110);
            Settings.multipartUploadThreshold = 100;
            expect(Settings.multipartUploadThreshold).toBe(100);
        });

        // uploadSpeedLimitEnabled
        it("uploadSpeedLimitEnabled getter", () => {
            expect(Settings.uploadSpeedLimitEnabled).toBe(1);
        });
        it("uploadSpeedLimitEnabled setter", () => {
            Settings.uploadSpeedLimitEnabled = 1;
            expect(Settings.uploadSpeedLimitEnabled).toBe(1);
            Settings.uploadSpeedLimitEnabled = 0;
            expect(Settings.uploadSpeedLimitEnabled).toBe(0);
        });

        // uploadSpeedLimitKbPerSec
        it("uploadSpeedLimitKbPerSec getter", () => {
            expect(Settings.uploadSpeedLimitKbPerSec).toBe(2048);
        });
        it("uploadSpeedLimitKbPerSec setter", () => {
            Settings.uploadSpeedLimitKbPerSec = 1024;
            expect(Settings.uploadSpeedLimitKbPerSec).toBe(1024);
            Settings.uploadSpeedLimitKbPerSec = 2048;
            expect(Settings.uploadSpeedLimitKbPerSec).toBe(2048);
        });

        // skipEmptyDirectoryUpload
        it("skipEmptyDirectoryUpload getter", () => {
            expect(Settings.skipEmptyDirectoryUpload).toBeFalsy();
        });
        it("skipEmptyDirectoryUpload setter", () => {
            Settings.skipEmptyDirectoryUpload = true;
            expect(Settings.skipEmptyDirectoryUpload).toBeTruthy();
            Settings.skipEmptyDirectoryUpload = false;
            expect(Settings.skipEmptyDirectoryUpload).toBeFalsy();
        });

        // resumeDownload
        it("resumeDownload getter", () => {
            expect(Settings.resumeDownload).toBe(1);
        });
        it("resumeDownload setter", () => {
            Settings.resumeDownload = 0;
            expect(Settings.resumeDownload).toBe(0);
            Settings.resumeDownload = 1;
            expect(Settings.resumeDownload).toBe(1);
        });

        // maxDownloadConcurrency
        it("maxDownloadConcurrency getter", () => {
            expect(Settings.maxDownloadConcurrency).toBe(2);
        });
        it("maxDownloadConcurrency setter", () => {
            Settings.maxDownloadConcurrency = 1;
            expect(Settings.maxDownloadConcurrency).toBe(1);
            Settings.maxDownloadConcurrency = 2;
            expect(Settings.maxDownloadConcurrency).toBe(2);
        });

        // multipartDownloadSize
        it("multipartDownloadSize getter", () => {
            expect(Settings.multipartDownloadSize).toBe(4);
        });
        it("multipartDownloadSize setter", () => {
            Settings.multipartDownloadSize = 8;
            expect(Settings.multipartDownloadSize).toBe(8);
            Settings.multipartDownloadSize = 4;
            expect(Settings.multipartDownloadSize).toBe(4);
        });

        // multipartDownloadThreshold
        it("multipartDownloadThreshold getter", () => {
            expect(Settings.multipartDownloadThreshold).toBe(110);
        });
        it("multipartDownloadThreshold setter", () => {
            Settings.multipartDownloadThreshold = 100;
            expect(Settings.multipartDownloadThreshold).toBe(100);
            Settings.multipartDownloadThreshold = 110;
            expect(Settings.multipartDownloadThreshold).toBe(110);
        });

        // downloadSpeedLimitEnabled
        it("downloadSpeedLimitEnabled getter", () => {
            expect(Settings.downloadSpeedLimitEnabled).toBe(1);
        });
        it("downloadSpeedLimitEnabled setter", () => {
            Settings.downloadSpeedLimitEnabled = 0;
            expect(Settings.downloadSpeedLimitEnabled).toBe(0);
            Settings.downloadSpeedLimitEnabled = 1;
            expect(Settings.downloadSpeedLimitEnabled).toBe(1);
        });

        // downloadSpeedLimitKbPerSec
        it("downloadSpeedLimitKbPerSec getter", () => {
            expect(Settings.downloadSpeedLimitKbPerSec).toBe(2048);
        });
        it("downloadSpeedLimitKbPerSec setter", () => {
            Settings.downloadSpeedLimitKbPerSec = 1024;
            expect(Settings.downloadSpeedLimitKbPerSec).toBe(1024);
            Settings.downloadSpeedLimitKbPerSec = 2048;
            expect(Settings.downloadSpeedLimitKbPerSec).toBe(2048);
        });

        // overwriteDownload
        it("overwriteDownload getter", () => {
            expect(Settings.overwriteDownload).toBeTruthy();
        });
        it("overwriteDownload setter", () => {
            Settings.overwriteDownload = false;
            expect(Settings.overwriteDownload).toBeFalsy();
            Settings.overwriteDownload = true;
            expect(Settings.overwriteDownload).toBeTruthy();
        });

        // externalPathEnabled
        it("externalPathEnabled getter", () => {
            expect(Settings.externalPathEnabled).toBe(1);
        });
        it("externalPathEnabled setter", () => {
            Settings.externalPathEnabled = 0;
            expect(Settings.externalPathEnabled).toBe(0);
            Settings.externalPathEnabled = 1;
            expect(Settings.externalPathEnabled).toBe(1);
        });

        // stepByStepLoadingFiles
        it("stepByStepLoadingFiles getter", () => {
            expect(Settings.stepByStepLoadingFiles).toBe(0);
        });
        it("stepByStepLoadingFiles setter", () => {
            Settings.stepByStepLoadingFiles = 1;
            expect(Settings.stepByStepLoadingFiles).toBe(1);
            Settings.stepByStepLoadingFiles = 0;
            expect(Settings.stepByStepLoadingFiles).toBe(0);
        });

        // filesLoadingSize
        it("filesLoadingSize getter", () => {
            expect(Settings.filesLoadingSize).toBe(600);
        });
        it("filesLoadingSize setter", () => {
            Settings.filesLoadingSize = 500
            expect(Settings.filesLoadingSize).toBe(500);
            Settings.filesLoadingSize = 600
            expect(Settings.filesLoadingSize).toBe(600);
        });

        // historiesLength
        it("historiesLength getter", () => {
            expect(Settings.historiesLength).toBe(110);
        });
        it("historiesLength setter", () => {
            Settings.historiesLength = 100
            expect(Settings.historiesLength).toBe(100);
            Settings.historiesLength = 110
            expect(Settings.historiesLength).toBe(110);
        });


        // language
        it("language getter", () => {
            expect(Settings.language).toBe(LangName.EN_US);
        });
        it("language setter", () => {
            Settings.language = LangName.ZH_CN;
            expect(Settings.language).toBe(LangName.ZH_CN);
        });

        // content view style
        it("content view style getter", () => {
            expect(Settings.contentViewStyle).toBe(ContentViewStyle.Grid);
        });
        it("content view style setter", () => {
            Settings.contentViewStyle = ContentViewStyle.Table;
            expect(Settings.contentViewStyle).toBe(ContentViewStyle.Table);
        });
    });

    describe("events", () => {
      const handler = jest.fn();
      const EXPECT_CHANGES = {
        "isDebug": 1,
        "autoUpgrade": 1,
        "resumeUpload": 1,
        "maxUploadConcurrency": 1,
        "multipartUploadSize": 8,
        "multipartUploadThreshold": 100,
        "uploadSpeedLimitEnabled": 1,
        "uploadSpeedLimitKbPerSec": 2048,
        "skipEmptyDirectoryUpload": true,
        "resumeDownload": 1,
        "maxDownloadConcurrency": 2,
        "multipartDownloadSize": 4,
        "multipartDownloadThreshold": 100,
        "downloadSpeedLimitEnabled": 1,
        "downloadSpeedLimitKbPerSec": 2048,
        "overwriteDownload": true,
        "externalPathEnabled": 1,
        "stepByStepLoadingFiles": 1,
        "filesLoadingSize": 600,
        "historiesLength": 110,
        "language": LangName.EN_US,
      };

      it("onChange", () =>  {
        Settings.onChange(handler);
        const enumKeyValues = Object.entries(SettingKey);
        for (const [k, v] of Object.entries(EXPECT_CHANGES)) {
          handler.mockReset();
          const [,settingKey] = enumKeyValues.find(([, enumVal]) => enumVal === k) ?? [undefined, undefined];
          // @ts-ignore
          Settings[k] = v;
          expect(handler).toBeCalledWith({
            key: settingKey,
            value: v,
          });
        }
      });
      it("offChange", () =>  {
        handler.mockReset();
        Settings.offChange(handler);
        for (const [k, v] of Object.entries(EXPECT_CHANGES)) {
          // @ts-ignore
          Settings[k] = v;
        }
        expect(handler).not.toBeCalled();
      });
    });
});
