import {mocked} from "ts-jest/utils";
import * as MockAuth from "@common/qiniu/_mock-helpers_/auth";
import {mockUploader} from "@common/qiniu/_mock-helpers_/uploader";

jest.mock("kodo-s3-adapter-sdk", () => mockUploader());

import {Uploader} from "kodo-s3-adapter-sdk";

import {BackendMode} from "@common/qiniu";
import {Status} from "@common/models/job/types";

import UploadJob from "./upload-job";
import mockFs from "mock-fs";

describe("test models/job/upload-job.ts", () => {
    const MockedUploader = mocked(Uploader, true);

    describe("test UploadJob methods", () => {
        beforeAll(() => {
          console.log('calling this to prevent mock-fs cause jest console error');
        });

        beforeEach(() => {
            mockFs({
                "/path/to/dir": {
                    "file-to-upload.txt": "some content",
                },
            });
        });
        afterEach(() => {
            mockFs.restore();
        });
        it("test UploadJob start", async () => {
            const uploadJob = new UploadJob({
                clientOptions: {
                    accessKey: MockAuth.QINIU_ACCESS_KEY,
                    secretKey: MockAuth.QINIU_SECRET_KEY,
                    ucUrl: MockAuth.QINIU_UC,
                    regions: [],
                    backendMode: BackendMode.Kodo,
                },
                from: {
                    name: "file-to-upload.txt",
                    path: "/path/to/dir/file-to-upload.txt",
                    size: 1024,
                    mtime: 1658815528906,
                },
                to: {
                    bucket: "fake-bucket",
                    key: "path/to/file-to-upload.txt",
                },
                overwrite: true,
                region: "fake-region",
                storageClassName: "standard",
                storageClasses: [],
            });

            await uploadJob.start();
            expect(MockedUploader.prototype.putObjectFromFile).toBeCalledTimes(1);
            const [
                regionName,
                objectInfo,
            ] = MockedUploader.prototype.putObjectFromFile.mock.calls[0];
            expect(regionName).toBe("fake-region");
            expect(objectInfo).toStrictEqual({
                bucket: "fake-bucket",
                key: "path/to/file-to-upload.txt",
                storageClassName: "standard",
            });
            expect(uploadJob.status).toBe(Status.Finished);
        });
    });
});
