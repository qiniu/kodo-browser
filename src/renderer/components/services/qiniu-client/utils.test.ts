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
jest.mock("kodo-s3-adapter-sdk", () => ({
    __esModule: true,
    ...jest.requireActual("kodo-s3-adapter-sdk"),
    Region: {
        query: ({ ucUrl }: { ucUrl: string }) => {
            switch (ucUrl) {
                case "http://mock-ucurl/success":
                    return Promise.resolve();
                case "http://mock-ucurl/404":
                    return Promise.reject({ res: { statusCode: 404 }});
                case "http://mock-ucurl/err/ENOTFOUND":
                    return Promise.reject({ code: "ENOTFOUND" });
                case "http://mock-ucurl/err/ECONNREFUSED":
                    return Promise.reject({ code: "ECONNREFUSED" });
                default:
                    return Promise.reject(new Error("unknown error"));
            }
        },
    },
}));

import { mocked } from "ts-jest/utils";
import { Kodo as KodoAdapter } from "kodo-s3-adapter-sdk/dist/kodo";
import { S3 as S3Adapter } from "kodo-s3-adapter-sdk/dist/s3";
import { Path as QiniuPath } from "qiniu-path/dist/src/path";

import * as KodoNav from "@/const/kodo-nav";
import * as QiniuClientCommon from "./common";
import * as QiniuClientUtils from "./utils";

describe("test qiniu-client/utils.ts", () => {
    describe("isQueryRegionAPIAvailable", () => {
        it("success", () => {
            return expect(QiniuClientUtils.isQueryRegionAPIAvailable("http://mock-ucurl/success"))
                .resolves
                .toBeTruthy()
        });

        it("404", () => {
            return expect(QiniuClientUtils.isQueryRegionAPIAvailable("http://mock-ucurl/404"))
                .resolves
                .toBeFalsy();
        });

        it("ENOTFOUND", ()=> {
            return expect(QiniuClientUtils.isQueryRegionAPIAvailable("http://mock-ucurl/err/ENOTFOUND"))
                .resolves
                .toBeFalsy();
        });

        it("ECONNREFUSED", ()=> {
            return expect(QiniuClientUtils.isQueryRegionAPIAvailable("http://mock-ucurl/err/ECONNREFUSED"))
                .resolves
                .toBeFalsy();
        });

        it("other err", ()=> {
            return expect(QiniuClientUtils.isQueryRegionAPIAvailable("http://mock-ucurl/err/unknown"))
                .resolves
                .toBeTruthy()
        });
    });
    describe("parseKodoPath", () => {
        it("path not a kodo protocol", () => {
            expect(
                QiniuClientUtils
                    .parseKodoPath("/a/invalid/kodo/protocol")
            ).toEqual({});
        });
        it("path only a kodo protocol", () => {
            expect(
                QiniuClientUtils
                    .parseKodoPath(KodoNav.ADDR_KODO_PROTOCOL)
            ).toEqual({});
        });
        it("path start with a valid kodo protocol", () => {
            expect(
                QiniuClientUtils
                    .parseKodoPath(`${KodoNav.ADDR_KODO_PROTOCOL}kodo-browser/QiniuClientUtils/parseKodoPath`)
            ).toEqual({
                bucketName: "kodo-browser",
                key: "QiniuClientUtils/parseKodoPath",
            });
        });
    });
    describe("listDomains", () => {
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
        beforeEach(() => {
            spiedGetDefaultClient.mockClear();

            MockedKodoAdapter.mockClear();
            MockedKodoAdapter.prototype.enter.mockClear();
            MockedKodoAdapter.prototype.getObjectURL.mockClear();

            MockedS3Adapter.mockClear();
            MockedS3Adapter.prototype.enter.mockClear();
            MockedS3Adapter.prototype.getObjectURL.mockClear();
        });
        it("listDomains with KodoAdapter", async () => {
            // mock public to use KodoAdapter
            MockAuth.mockPublicAuthInfo();
            await QiniuClientUtils.listDomains(
                "region-kodo-browser-Kodo-listDomains",
                "bucket-kodo-browser-Kodo-listDomains",
                opt,
            );
            expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
            const [ enterParamsName ] = MockedKodoAdapter.prototype.enter.mock.calls[0];
            expect(enterParamsName).toBe("listDomains");
            expect(MockedKodoAdapter.prototype.listDomains).toBeCalledWith(
                "region-kodo-browser-Kodo-listDomains",
                "bucket-kodo-browser-Kodo-listDomains",
            );
            MockAuth.resetAuthInfo();
        });
        it("listDomains with S3Adapter", async () => {
            await QiniuClientUtils.listDomains(
                "region-kodo-browser-S3-listDomains",
                "bucket-kodo-browser-S3-listDomains",
                opt,
            );
            expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
            const [ enterParamsName ] = MockedS3Adapter.prototype.enter.mock.calls[0];
            expect(enterParamsName).toBe("listDomains");
            expect(MockedS3Adapter.prototype.listDomains).toBeCalledWith(
                "region-kodo-browser-S3-listDomains",
                "bucket-kodo-browser-S3-listDomains",
            );
        });
    });
    describe("signatureUrl", () => {
        const spiedGetDefaultClient = jest.spyOn(QiniuClientCommon, "getDefaultClient");
        const MockedKodoAdapter = mocked(KodoAdapter, true);
        const MockedS3Adapter = mocked(S3Adapter, true);
        const mockDate = new Date();
        const ENV = {
            QINIU_ACCESS_KEY: MockAuth.QINIU_ACCESS_KEY,
            QINIU_SECRET_KEY: MockAuth.QINIU_SECRET_KEY,
        }
        const opt: QiniuClientCommon.GetAdapterOptionParam = {
            id: ENV.QINIU_ACCESS_KEY,
            secret: ENV.QINIU_SECRET_KEY,
            isPublicCloud: true,
        };
        beforeEach(() => {
            spiedGetDefaultClient.mockClear();

            MockedKodoAdapter.mockClear();
            MockedKodoAdapter.prototype.enter.mockClear();
            MockedKodoAdapter.prototype.getObjectURL.mockClear();

            MockedS3Adapter.mockClear();
            MockedS3Adapter.prototype.enter.mockClear();
            MockedS3Adapter.prototype.getObjectURL.mockClear();


            jest.useFakeTimers()
                .setSystemTime(mockDate);
        });
        afterEach(() => {
            jest.useRealTimers();
        })

        it("signatureUrl with KodoAdapter", async () => {
            // mock public to use KodoAdapter
            MockAuth.mockPublicAuthInfo();
            const mockDataKey = new QiniuPath(
                "/",
                "/",
                "/kodo-browser/QiniuClientUtils/signatureUrl.txt",
                ".txt",
                ["kodo-browser", "QiniuClientUtils", "signatureUrl.txt"],
                false,
            );
            await QiniuClientUtils.signatureUrl(
                "region-kodo-browser-Kodo-signatureUrl",
                "bucket-kodo-browser-Kodo-signatureUrl",
                mockDataKey,
                undefined,
                10,
                opt,
            );
            expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
            const [ enterParamsName ] = MockedKodoAdapter.prototype.enter.mock.calls[0];
            expect(enterParamsName).toBe("signatureUrl");
            const expectDeadline = new Date(mockDate);
            expectDeadline.setSeconds(expectDeadline.getSeconds() + 10 || 60);
            expect(MockedKodoAdapter.prototype.getObjectURL).toBeCalledWith(
                "region-kodo-browser-Kodo-signatureUrl",
                {
                    bucket: "bucket-kodo-browser-Kodo-signatureUrl",
                    key: mockDataKey.toString(),
                },
                undefined,
                expectDeadline,
            );
            MockAuth.resetAuthInfo();
        });
        it("signatureUrl with S3Adapter", async () => {
            const mockDataKey = new QiniuPath(
                "/",
                "/",
                "/kodo-browser/QiniuClientUtils/signatureUrl.txt",
                ".txt",
                ["kodo-browser", "QiniuClientUtils", "signatureUrl.txt"],
                false,
            );
            await QiniuClientUtils.signatureUrl(
                "region-kodo-browser-S3-signatureUrl",
                "bucket-kodo-browser-S3-signatureUrl",
                mockDataKey,
                undefined,
                10,
                opt,
            );
            expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
            const [ enterParamsName ] = MockedS3Adapter.prototype.enter.mock.calls[0];
            expect(enterParamsName).toBe("signatureUrl");
            const expectDeadline = new Date(mockDate);
            expectDeadline.setSeconds(expectDeadline.getSeconds() + 10 || 60);
            expect(MockedS3Adapter.prototype.getObjectURL).toBeCalledWith(
                "region-kodo-browser-S3-signatureUrl",
                {
                    bucket: "bucket-kodo-browser-S3-signatureUrl",
                    key: mockDataKey.toString(),
                },
                undefined,
                expectDeadline,
            );
        });
    });
});
