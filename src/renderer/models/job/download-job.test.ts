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
import { IpcJobEvent, Status } from "./types";
import { downloadOptionsFromResumeJob } from "./_mock-helpers_/data";

import DownloadJob from "./download-job";

describe("test models/job/download-job.ts",  () => {
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
});
