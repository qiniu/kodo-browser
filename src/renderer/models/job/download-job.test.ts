jest.mock("electron", () => ({
    __esModule: true,
    ipcRenderer: {
        on: jest.fn(),
        send: jest.fn(),
        removeListener: jest.fn(),
    }
}));

import { ipcRenderer } from "electron";
import * as AppConfig from "@/const/app-config";

import { EventKey, IpcJobEvent, Status } from "./types";
import { downloadOptionsFromResumeJob } from "./_mock-helpers_/data";

import DownloadJob from "./download-job";

describe("test models/job/download-job.ts", () => {
    describe("test stop", () => {
        it("stop", () => {
            const downloadJob = new DownloadJob(downloadOptionsFromResumeJob);
            const spiedEmit = jest.spyOn(downloadJob, "emit");
            spiedEmit.mockImplementation((_eventName: string, ..._args: any[]) => downloadJob);
            expect(downloadJob.stop()).toBe(downloadJob);
            expect(downloadJob.speed).toBe(0);
            expect(downloadJob.predictLeftTime).toBe(0);
            expect(downloadJob.status).toBe(Status.Stopped);
            expect(downloadJob.emit).toBeCalledWith("stop");
            expect(ipcRenderer.send).toBeCalledWith(
                "asynchronous-job",
                {
                    job: downloadJob.id,
                    key: IpcJobEvent.Stop,
                },
            );
            expect(ipcRenderer.removeListener).toBeCalledWith(
                downloadJob.id,
                downloadJob.startDownload,
            );
        });
    });

    describe("test start", () => {
        it("start()", () => {
            const downloadJob = new DownloadJob(downloadOptionsFromResumeJob);
            const spiedEmit = jest.spyOn(downloadJob, "emit");
            spiedEmit.mockImplementation((_eventName: string, ..._args: any[]) => downloadJob);
            expect(downloadJob.start()).toBe(downloadJob);
            expect(downloadJob.message).toBe("");

            // private status flow
            expect(downloadJob.emit).toBeCalledWith("statuschange", Status.Running);
            expect(downloadJob.status).toBe(Status.Running);

            // ipcRenderer flow
            expect(ipcRenderer.on).toBeCalledWith(downloadJob.id, downloadJob.startDownload);
            expect(ipcRenderer.send).toBeCalledWith(
                "asynchronous-job",
                {
                    clientOptions: {
                        accessKey: "NgKd0BmebvsFERFEBfKVVZGeGn7VsZQe_H_AunOC",
                        backendMode: "s3",
                        regions: [],
                        secretKey: "lp4Zv3Gi_7CHtxNTcJx2Pum5hUJB3gHROcg4vp0i",
                        ucUrl: undefined,
                        userNatureLanguage: "zh-CN",
                    },
                    job: downloadJob.id,
                    key: "job-download",
                    options: {
                        kodoBrowserVersion: AppConfig.app.version,
                        maxConcurrency: 10,
                        multipartDownloadSize: 8388608,
                        multipartDownloadThreshold: 104857600,
                        resumeDownload: false,
                        downloadSpeedLimit: 0,
                    },
                    params: {
                        bucket: "kodo-browser-dev",
                        key: "remote/path/to/out.mp4",
                        localFile: "/local/path/to/out.mp4.download",
                        region: "cn-east-1",
                        isDebug: false,
                    },
                },
            );

            // startSpeedCounter flow
            expect(downloadJob.speed).toBe(0);
            expect(downloadJob.predictLeftTime).toBe(0);
            downloadJob.stop();
        });
    });

    describe("test resume download job", () => {
        it("getInfoForSave()", () => {
            const downloadJob = new DownloadJob(downloadOptionsFromResumeJob);

            // stat
            const fakeProgressTotal = 1024;
            const fakeProgressResumable = true;
            downloadJob.startDownload(null, {
                key: EventKey.Stat,
                data: {
                    progressTotal: fakeProgressTotal,
                    progressResumable: fakeProgressResumable,
                },
            });
            expect(downloadJob.prog.total).toBe(fakeProgressTotal);
            expect(downloadJob.prog.resumable).toBe(fakeProgressResumable);

            // progress
            const fakeProgressLoaded = 512;
            downloadJob.startDownload(null, {
                key: EventKey.Progress,
                data: {
                    progressLoaded: fakeProgressLoaded,
                    progressResumable: fakeProgressResumable,
                },
            });
            expect(downloadJob.prog.loaded).toBe(fakeProgressLoaded);
            expect(downloadJob.prog.resumable).toBe(fakeProgressResumable);

            // part downloaded
            const lastDownloadedSize = downloadJob.prog.loaded;
            const fakeDownloadedSize = 512;
            downloadJob.startDownload(null, {
                key: EventKey.PartDownloaded,
                data: {
                    size: fakeDownloadedSize,
                },
            });
            expect(downloadJob.prog.loaded).toBe(lastDownloadedSize + fakeDownloadedSize);

            // info should in disk
            expect(downloadJob.getInfoForSave())
                .toEqual({
                    storageClasses: downloadOptionsFromResumeJob.storageClasses,
                    region: downloadOptionsFromResumeJob.region,
                    to: downloadOptionsFromResumeJob.to,
                    from: downloadOptionsFromResumeJob.from,
                    backendMode: downloadOptionsFromResumeJob.backendMode,

                    prog: {
                        loaded: downloadJob.prog.loaded,
                        total: fakeProgressTotal,
                        resumable: fakeProgressResumable,
                    },
                    status: Status.Waiting,
                    message: "",
                });
        });
    })
});
