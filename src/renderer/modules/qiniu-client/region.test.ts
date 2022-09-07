import { Region } from "kodo-s3-adapter-sdk";
import * as MockAuth from "./_mock-helpers_/auth";
import * as MockAdapter from "./_mock-helpers_/adapter";
import * as MockData from "./_mock-helpers_/data";

jest.mock(
    "kodo-s3-adapter-sdk/dist/kodo",
    () => MockAdapter.mockAdapterFactory("Kodo"),
);
jest.mock(
    "kodo-s3-adapter-sdk/dist/s3",
    () => MockAdapter.mockAdapterFactory("S3"),
);
jest.mock("kodo-s3-adapter-sdk/dist/region_service", () => {
    const MockedRegionService = jest.fn();
    MockedRegionService.constructor = MockedRegionService;
    MockedRegionService.prototype.getAllRegions = jest.fn<Promise<Region[]>, [GetAllRegionsOptions]>()
        .mockResolvedValue(MockData.mockDataOfGetAllRegions);
    return {
        __esModule: true,
        RegionService: MockedRegionService,
    };
});

import { Kodo as KodoAdapter } from "kodo-s3-adapter-sdk/dist/kodo";
import { S3 as S3Adapter } from "kodo-s3-adapter-sdk/dist/s3";
import { GetAllRegionsOptions, RegionService } from "kodo-s3-adapter-sdk/dist/region_service";
import { mocked } from "ts-jest/utils";

import * as QiniuClientCommon from "./common";
import * as QiniuClientRegions from "./regions";

describe("test qiniu-client/region.ts", () => {
    const ENV = {
        QINIU_ACCESS_KEY: MockAuth.QINIU_ACCESS_KEY,
        QINIU_SECRET_KEY: MockAuth.QINIU_SECRET_KEY,
    }
    const opt: QiniuClientCommon.GetAdapterOptionParam = {
        id: ENV.QINIU_ACCESS_KEY,
        secret: ENV.QINIU_SECRET_KEY,
        isPublicCloud: true,
    };
    const MockedRegionService = mocked(RegionService, true);
    const MockedKodoAdapter = mocked(KodoAdapter, true);
    const MockedS3Adapter = mocked(S3Adapter, true);

    describe("test with KodoAdapter", () => {
        beforeEach(() => {
            MockedKodoAdapter.mockClear();
            MockedKodoAdapter.prototype.enter.mockClear();
        });

        it("test getRegions", async () => {
            const actualRegions = await QiniuClientRegions.getRegions(opt);
            const [ enterParamsName ] = MockedKodoAdapter.prototype.enter.mock.calls[0];
            expect(enterParamsName).toBe("getRegions");
            expect(MockedRegionService).toBeCalled();
            expect(MockedRegionService.prototype.getAllRegions).toBeCalled();
            expect(actualRegions).toEqual(MockData.mockDataOfGetAllRegions);
        });
    });

    describe("test with S3Adapter", () => {
        beforeAll(() => {
            // mock public to use S3Adapter
            opt.preferS3Adapter = true;
        });
        afterAll(() => {
            delete opt.preferS3Adapter;
        });
        beforeEach(() => {
            MockedS3Adapter.mockClear();
            MockedS3Adapter.prototype.enter.mockClear();
        });

        it("test getRegions", async () => {
            const actualRegions = await QiniuClientRegions.getRegions(opt);
            const [ enterParamsName ] = MockedS3Adapter.prototype.enter.mock.calls[0];
            expect(enterParamsName).toBe("getRegions");
            expect(actualRegions).toEqual(MockData.mockDataOfGetAllRegions);
        });
    });
});
