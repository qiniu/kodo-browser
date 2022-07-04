import { Status } from "./types";
import {uploadOptionsFromNewJob, uploadOptionsFromResumeJob} from "./_mock-helpers_/data";

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
            expect(uploadJob.emit).toBeCalledWith("statuschange", "stopped");
        });
    });

    // describe("test start", () => {
    //     it("start()", () => {
    //         const uploadJob = new UploadJob(uploadOptionsFromNewJob);
    //         const spiedEmit = jest.spyOn(uploadJob, "emit");
    //         spiedEmit.mockImplementation((_eventName: string, ..._args: any[]) => uploadJob);
    //         expect(uploadJob.start()).toBe(uploadJob);
    //         expect(uploadJob.message).toBe("");
    //
    //         // private status flow
    //         expect(uploadJob.emit).toBeCalledWith("statuschange", Status.Running);
    //         expect(uploadJob.status).toBe(Status.Running);
    //
    //         // startSpeedCounter flow
    //         expect(uploadJob.speed).toBe(0);
    //         expect(uploadJob.predictLeftTime).toBe(0);
    //         uploadJob.stop();
    //     });
    // });

    describe("test resume upload job", () => {
        it("test get persistInfo", () => {
            const uploadJob = new UploadJob(uploadOptionsFromResumeJob);
            expect(uploadJob.persistInfo).toStrictEqual({
                from: uploadOptionsFromResumeJob.from,
                storageClasses: uploadOptionsFromResumeJob.storageClasses,
                region: uploadOptionsFromResumeJob.region,
                to: uploadOptionsFromResumeJob.to,
                overwrite: uploadOptionsFromResumeJob.overwrite,
                storageClassName: uploadOptionsFromResumeJob.storageClassName,
                backendMode: uploadOptionsFromResumeJob.backendMode,
                prog: uploadOptionsFromResumeJob.prog,
                status: Status.Waiting,
                message: uploadOptionsFromResumeJob.message,
                uploadedId: uploadOptionsFromResumeJob.uploadedId,
                uploadedParts: uploadOptionsFromResumeJob.uploadedParts.map(p => ({ PartNumber: p.partNumber, ETag: p.etag })),
                multipartUploadThreshold: uploadOptionsFromResumeJob.multipartUploadThreshold,
                multipartUploadSize: uploadOptionsFromResumeJob.multipartUploadSize,
            });
        });
    });
});
