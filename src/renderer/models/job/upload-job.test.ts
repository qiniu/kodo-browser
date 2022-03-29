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

import { EventKey, IpcJobEvent, Status } from "./types";
import { uploadOptionsFromNewJob } from "./_mock-helpers_/data";

import UploadJob from "./upload-job";

describe("test models/job/upload-job.ts", () => {
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

    describe("test resume upload job", () => {
        it("getInfoForSave()", () => {
            const uploadJob = new UploadJob(uploadOptionsFromNewJob);
            uploadJob.on('partcomplete', (data) => {
                uploadJob.uploadedId = data.uploadId;
                uploadJob.uploadedParts[data.part.partNumber] = data.part;
                return false;
            })

            // stat
            const fakeProgressTotal = 1024;
            const fakeProgressResumable = true;
            uploadJob.startUpload(null, {
                key: EventKey.Stat,
                data: {
                    progressTotal: fakeProgressTotal,
                    progressResumable: fakeProgressResumable,
                },
            });
            expect(uploadJob.prog.total).toBe(fakeProgressTotal);
            expect(uploadJob.prog.resumable).toBe(fakeProgressResumable);

            // progress
            const fakeProgressLoaded = 512;
            uploadJob.startUpload(null, {
                key: EventKey.Progress,
                data: {
                    progressLoaded: fakeProgressLoaded,
                    progressResumable: fakeProgressResumable,
                },
            });
            expect(uploadJob.prog.loaded).toBe(fakeProgressLoaded);
            expect(uploadJob.prog.resumable).toBe(fakeProgressResumable);

            // part uploaded
            const fakeUploadedId = 'fakeUploadId';
            const fakeUploadedPart = {
                partNumber: 0,
                etag: 'fakeETag',
            };
            uploadJob.startUpload(null, {
                key: EventKey.PartUploaded,
                data: {
                    uploadId: fakeUploadedId,
                    part: fakeUploadedPart,
                },
            });
            expect(uploadJob.uploadedParts.length).toBe(1);
            expect(uploadJob.uploadedId).toBe(fakeUploadedId);
            expect(uploadJob.uploadedParts).toEqual([
                fakeUploadedPart,
            ]);

            // info should in disk
            expect(uploadJob.getInfoForSave({}))
                .toEqual({
                    from: uploadOptionsFromNewJob.from,

                    backendMode: uploadOptionsFromNewJob.backendMode,
                    overwrite: uploadOptionsFromNewJob.overwrite,
                    to: uploadOptionsFromNewJob.to,
                    region: uploadOptionsFromNewJob.region,
                    storageClassName: uploadOptionsFromNewJob.storageClassName,
                    storageClasses: uploadOptionsFromNewJob.storageClasses,

                    prog: {
                        loaded: fakeProgressLoaded,
                        total: fakeProgressTotal,
                        resumable: fakeProgressResumable,
                    },
                    status: Status.Waiting,
                    uploadedId: fakeUploadedId,
                    uploadedParts: [
                        {
                            PartNumber: fakeUploadedPart.partNumber,
                            ETag: fakeUploadedPart.etag,
                        },
                    ],
                    message: "",
                });
        });
    });
});
