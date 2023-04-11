import * as MockAuth from "./_mock-helpers_/auth";
import * as MockAdapter from "./_mock-helpers_/adapter";

jest.mock(
    "kodo-s3-adapter-sdk/dist/kodo",
    () => MockAdapter.mockAdapterFactory("Kodo"),
);
jest.mock(
    "kodo-s3-adapter-sdk/dist/s3",
    () => MockAdapter.mockAdapterFactory("S3"),
);

import { mocked } from "ts-jest/utils";
import { Kodo as KodoAdapter } from "kodo-s3-adapter-sdk/dist/kodo";
import { S3 as S3Adapter } from "kodo-s3-adapter-sdk/dist/s3";

import * as QiniuClientCommon from "./common";
import * as QiniuClientBuckets from "./buckets";

describe("test qiniu-client/buckets.ts", () => {
    const spiedGetDefaultClient = jest.spyOn(QiniuClientCommon, "getDefaultClient");
    const MockedKodoAdapter = mocked(KodoAdapter, true);
    const MockedS3Adapter = mocked(S3Adapter, true);
    const ENV = {
        QINIU_ACCESS_KEY: MockAuth.QINIU_ACCESS_KEY,
        QINIU_SECRET_KEY: MockAuth.QINIU_SECRET_KEY,
    }
    const opt: QiniuClientCommon.GetAdapterOptionParam = {
        id: ENV.QINIU_ACCESS_KEY,
        secret: ENV.QINIU_SECRET_KEY,
        isPublicCloud: true,
    };

    describe("Kodo", () => {
        beforeEach(() => {
            spiedGetDefaultClient.mockClear();
            MockedKodoAdapter.mockClear();
            MockedKodoAdapter.prototype.enter.mockClear()
            MockedKodoAdapter.prototype.listBuckets.mockClear();
            MockedKodoAdapter.prototype.createBucket.mockClear();
            MockedKodoAdapter.prototype.deleteBucket.mockClear();
        });

        it("listAllBuckets", async () => {
            await QiniuClientBuckets.listAllBuckets(opt);
            expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
            const [ enterParamsName ] = MockedKodoAdapter.prototype.enter.mock.calls[0];
            expect(enterParamsName).toBe("listBuckets");
            expect(MockedKodoAdapter.prototype.listBuckets).toBeCalledTimes(1);
        });

        it("createBucket", async () => {
            await QiniuClientBuckets.createBucket(
                "region-kodo-browser-Kodo-createBucket",
                "bucket-kodo-browser-Kodo-createBucket",
                opt,
            );
            expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
            const [ enterParamsName ] = MockedKodoAdapter.prototype.enter.mock.calls[0]
            expect(enterParamsName).toBe("createBucket");
            expect(MockedKodoAdapter.prototype.createBucket).toBeCalledWith(
                "region-kodo-browser-Kodo-createBucket",
                "bucket-kodo-browser-Kodo-createBucket",
            );
        });

        it("deleteBucket", async () => {
            await QiniuClientBuckets.deleteBucket(
                "region-kodo-browser-Kodo-deleteBucket",
                "bucket-kodo-browser-Kodo-deleteBucket",
                opt,
            );
            expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
            const [ enterParamsName ] = MockedKodoAdapter.prototype.enter.mock.calls[0]
            expect(enterParamsName).toBe("deleteBucket");
            expect(MockedKodoAdapter.prototype.deleteBucket).toBeCalledWith(
                "region-kodo-browser-Kodo-deleteBucket",
                "bucket-kodo-browser-Kodo-deleteBucket",
            );
        });
    });

    describe("S3", () => {
        beforeAll(() => {
          // mock public to use S3Adapter
          opt.preferS3Adapter = true;
        });

        afterAll(() => {
          delete opt.preferS3Adapter;
        });

        beforeEach(() => {
            spiedGetDefaultClient.mockClear();
            MockedS3Adapter.mockClear();
            MockedS3Adapter.prototype.enter.mockClear()
            MockedS3Adapter.prototype.listBuckets.mockClear();
            MockedS3Adapter.prototype.createBucket.mockClear();
            MockedS3Adapter.prototype.deleteBucket.mockClear();
        });

        it("listAllBuckets", async () => {
            await QiniuClientBuckets.listAllBuckets(opt);
            expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
            const [ enterParamsName ] = MockedS3Adapter.prototype.enter.mock.calls[0];
            expect(enterParamsName).toBe("listBuckets");
            expect(MockedS3Adapter.prototype.listBuckets).toBeCalled();
        });

        it("createBucket", async () => {
            await QiniuClientBuckets.createBucket(
                "region-kodo-browser-S3-createBucket",
                "bucket-kodo-browser-S3-createBucket",
                opt,
            );
            expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
            const [ enterParamsName ] = MockedS3Adapter.prototype.enter.mock.calls[0];
            expect(enterParamsName).toBe("createBucket");
            expect(MockedS3Adapter.prototype.createBucket).toBeCalledWith(
                "region-kodo-browser-S3-createBucket",
                "bucket-kodo-browser-S3-createBucket",
            );
        });

        it("deleteBucket", async () => {
            await QiniuClientBuckets.deleteBucket(
                "region-kodo-browser-S3-deleteBucket",
                "bucket-kodo-browser-S3-deleteBucket",
                opt,
            );
            expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
            const [ enterParamsName ] = MockedS3Adapter.prototype.enter.mock.calls[0];
            expect(enterParamsName).toBe("deleteBucket");
            expect(MockedS3Adapter.prototype.deleteBucket).toBeCalledWith(
                "region-kodo-browser-S3-deleteBucket",
                "bucket-kodo-browser-S3-deleteBucket",
            );
        });
    });


});
