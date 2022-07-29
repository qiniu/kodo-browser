import * as MockAuth from "./_mock-helpers_/auth";
import { mocked } from "ts-jest/utils";
import mockFs from "mock-fs";
import fs from "fs";

jest.mock("kodo-s3-adapter-sdk", () => {
    const mockedDownloader = jest.fn();
    mockedDownloader.constructor = mockedDownloader;
    mockedDownloader.prototype.getObjectToFile = function (_region: string, _obj: Object, tempFilepath: string) {
        return new Promise(resolve => {
            fs.copyFileSync("/path/to/dir/to-be-downloaded.txt", tempFilepath); // mock downloaded
            setTimeout(resolve, 300)
        });
    };
    mockedDownloader.prototype.getObjectToFile =
        jest.fn(mockedDownloader.prototype.getObjectToFile);
    mockedDownloader.prototype.abort = jest.fn();

    return {
        __esModule: true,
        ...jest.requireActual("kodo-s3-adapter-sdk"),
        Downloader: mockedDownloader,
    }
});

import {Downloader} from "kodo-s3-adapter-sdk";

import {BackendMode} from "@common/qiniu";
import {Status} from "@common/models/job/types";

import DownloadJob from "./download-job";

describe("test models/job/download-job.ts", () => {
    const MockedDownloader = mocked(Downloader, true);

    describe("test DownloadJob methods", () => {
        beforeEach(() => {
            mockFs({
                "/path/to/dir": {
                    "to-be-downloaded.txt": "some content",
                },
            });
        });
        afterEach(() => {
            mockFs.restore();
        });
        it("test DownloadJob start", async () => {
            const downloadJob = new DownloadJob({
                clientOptions: {
                    accessKey: MockAuth.QINIU_ACCESS_KEY,
                    secretKey: MockAuth.QINIU_SECRET_KEY,
                    ucUrl: MockAuth.QINIU_UC,
                    regions: [],
                    backendMode: BackendMode.Kodo,
                },
                from: {
                    bucket: "fake-bucket",
                    key: "path/to/fake-filename",
                    size: 1024,
                    mtime: 1658815528906,
                },
                to: {
                    name: "fake-filename",
                    path: "/path/to/dir/fake-filename",
                },
                overwrite: false,
                region: "fake-region",
                storageClasses: [],
            });

            await downloadJob.start();
            expect(MockedDownloader.prototype.getObjectToFile).toBeCalledTimes(1);
            const [
                regionName,
                objectInfo,
                localFile,
            ] = MockedDownloader.prototype.getObjectToFile.mock.calls[0];
            expect(regionName).toBe("fake-region");
            expect(objectInfo).toStrictEqual({
                bucket: "fake-bucket",
                key: "path/to/fake-filename",
            });
            expect(localFile).toBe("/path/to/dir/fake-filename.download");
            expect(downloadJob.message).toBe("");
            expect(downloadJob.status).toBe(Status.Finished);
        });
    });

    describe("test DownloadJob.getTempFilePath", () => {
        beforeAll(() => {
            mockFs({
                "/path/to": {
                    "exists-file": "some contents",
                    "exists-file.txt": "some contents",
                    "downloading-file.txt.download": "some contents",
                },
            });
        });
        afterAll(() => {
            mockFs.restore();
        });
        it("file exists", async () => {
            const filePath = "/path/to/exists-file.txt";
            const actual = await DownloadJob.getTempFilePath(filePath);
            expect(actual).toBe("/path/to/exists-file.1.txt.download");
        });
        it("no file exists", async () => {
            const filePath = "/path/to/non-exists-file.txt";
            const actual = await DownloadJob.getTempFilePath(filePath);
            expect(actual).toBe("/path/to/non-exists-file.txt.download");
        });
        it("downloading file exists", async () => {
            const filePath = "/path/to/downloading-file.txt";
            const actual = await DownloadJob.getTempFilePath(filePath);
            expect(actual).toBe("/path/to/downloading-file.1.txt.download");
        });
        it("no file exists without ext", async () => {
            const filePath = "/path/to/non-exists-file";
            const actual = await DownloadJob.getTempFilePath(filePath);
            expect(actual).toBe("/path/to/non-exists-file.download");
        });
        it("file exists without ext", async () => {
            const filePath = "/path/to/exists-file";
            const actual = await DownloadJob.getTempFilePath(filePath);
            expect(actual).toBe("/path/to/exists-file.1.download");
        });
    });
});
