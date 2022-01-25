jest.mock("electron", () => ({
    __esModule: true,
    ipcRenderer: {
        on: jest.fn(),
        send: jest.fn(),
        removeListener: jest.fn(),
    }
}));

import { ipcRenderer } from "electron";
import * as AppConfig from "@/const/app-config"

import { IpcJobEvent, Status } from "./types";
import { uploadOptionsFromNewJob } from "./_mock-helpers_/data";

import UploadJob from "./upload-job";

describe("test models/job/upload-job.ts",  () => {
    describe("test stop", () => {
        it("stop", () => {
            const uploadJob = new UploadJob(uploadOptionsFromNewJob);
            const spiedEmit = jest.spyOn(uploadJob, "emit");
            spiedEmit.mockImplementation((_eventName: string, ..._args: any[]) => uploadJob);
            expect(uploadJob.stop()).toBe(uploadJob);
            expect(uploadJob.speed).toBe(0);
            expect(uploadJob.predictLeftTime).toBe(0);
            expect(uploadJob.status).toBe(Status.Stopped);
            expect(uploadJob.emit).toBeCalledWith("stop");
            expect(ipcRenderer.send).toBeCalledWith(
                "asynchronous-job",
                {
                    job: uploadJob.id,
                    key: IpcJobEvent.Stop,
                }
            );
            expect(ipcRenderer.removeListener).toBeCalledWith(
                uploadJob.id,
                uploadJob.startUpload,
            );
        });
    });

    describe("test start", () => {
        it("start()", () => {
            const uploadJob = new UploadJob(uploadOptionsFromNewJob);
            const spiedEmit = jest.spyOn(uploadJob, "emit");
            spiedEmit.mockImplementation((_eventName: string, ..._args: any[]) => uploadJob);
            expect(uploadJob.start()).toBe(uploadJob);
            expect(uploadJob.message).toBe("");

            // private status flow
            expect(uploadJob.emit).toBeCalledWith("statuschange", Status.Running);
            expect(uploadJob.status).toBe(Status.Running);

            // ipcRenderer flow
            expect(ipcRenderer.on).toBeCalledWith(uploadJob.id, uploadJob.startUpload);
            expect(ipcRenderer.send).toBeCalledWith(
                "asynchronous-job",
                {
                    clientOptions: {
                        accessKey: "NgKd0BmebvsFERFEBfKVVZGeGn7VsZQe_H_AunOC",
                        backendMode: "kodo",
                        regions: [],
                        secretKey: "lp4Zv3Gi_7CHtxNTcJx2Pum5hUJB3gHROcg4vp0i",
                        ucUrl: undefined,
                        userNatureLanguage: "zh-CN",
                    },
                    job: uploadJob.id,
                    key: "job-upload",
                    options: {
                        kodoBrowserVersion: AppConfig.app.version,
                        maxConcurrency: 10,
                        multipartUploadSize: 16777216,
                        multipartUploadThreshold: 104857600,
                        resumeUpload: false,
                        uploadSpeedLimit: 0,
                    },
                    params: {
                        bucket: "kodo-browser-dev",
                        key: "remote/path/to/out.gif",
                        localFile: "/local/path/to/out.gif",
                        overwriteDup: false,
                        region: "cn-east-1",
                        storageClassName: "Standard",
                        storageClasses: [],
                        isDebug: false,
                    },
                },
            );

            // startSpeedCounter flow
            expect(uploadJob.speed).toBe(0);
            expect(uploadJob.predictLeftTime).toBe(0);
            uploadJob.stop();
        });
    });
});
