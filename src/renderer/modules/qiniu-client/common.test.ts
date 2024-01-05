import * as MockConfigFile from "@common/qiniu/_mock-helpers_/config-file";
import * as MockAuth from "@common/qiniu/_mock-helpers_/auth";

import { RegionService } from "kodo-s3-adapter-sdk/dist/region_service";

jest.mock("kodo-s3-adapter-sdk/dist/region_service", () => ({
    __esModule: true,
    RegionService: jest.fn().mockReturnValue({ clearCache: () => {} }),
}));

import { Kodo as KodoAdapter } from "kodo-s3-adapter-sdk/dist/kodo";
import { S3 as S3Adapter } from "kodo-s3-adapter-sdk/dist/s3";
import { KODO_MODE, S3_MODE } from "kodo-s3-adapter-sdk";

import {EndpointType} from "@renderer/modules/auth";
import {getEndpointConfig} from "@renderer/modules/user-config-store";
import * as QiniuClientCommon from "./common";

describe("test qiniu-client/common.ts", () => {
    const ENV = {
        QINIU_ACCESS_KEY: MockAuth.QINIU_ACCESS_KEY,
        QINIU_SECRET_KEY: MockAuth.QINIU_SECRET_KEY,
    }

    describe("clientBackendMode", () => {
        it("should kodo", () => {
            const opt: QiniuClientCommon.GetAdapterOptionParam = {
                id: ENV.QINIU_ACCESS_KEY,
                secret: ENV.QINIU_SECRET_KEY,
                isPublicCloud: true,
            };
            expect(QiniuClientCommon.clientBackendMode(opt)).toBe(KODO_MODE);
            opt.preferKodoAdapter = true;
            expect(QiniuClientCommon.clientBackendMode(opt)).toBe(KODO_MODE);
        });
        it("should s3", async () => {
            const opt: QiniuClientCommon.GetAdapterOptionParam = {
                id: ENV.QINIU_ACCESS_KEY,
                secret: ENV.QINIU_SECRET_KEY,
                isPublicCloud: true,
                preferS3Adapter: true,
            };
            // preferS3Adapter || !isPublicCloud
            opt.preferS3Adapter = true;
            expect(QiniuClientCommon.clientBackendMode(opt)).toBe(S3_MODE);
            opt.isPublicCloud = false;
            MockConfigFile.mockCustomizeConfigFile();
            await getEndpointConfig({
                accessKey: ENV.QINIU_ACCESS_KEY,
                accessSecret: ENV.QINIU_SECRET_KEY,
                endpointType: EndpointType.Private,
            }).loadFromPersistence();
            expect(QiniuClientCommon.clientBackendMode(opt)).toBe(S3_MODE);
            delete opt.preferS3Adapter;
            expect(QiniuClientCommon.clientBackendMode(opt)).toBe(S3_MODE);
            MockConfigFile.resetConfigFile();
        });
    });

    describe("getDefaultClient", () => {
        it("should kodo adapter", () => {
            const opt: QiniuClientCommon.GetAdapterOptionParam = {
                id: ENV.QINIU_ACCESS_KEY,
                secret: ENV.QINIU_SECRET_KEY,
                isPublicCloud: true,
            };
            expect(QiniuClientCommon.getDefaultClient(opt).constructor).toBe(KodoAdapter);
            opt.preferKodoAdapter = true;
            expect(QiniuClientCommon.getDefaultClient(opt).constructor).toBe(KodoAdapter);
        });

        it("should s3 adapter", async () => {
            const opt: QiniuClientCommon.GetAdapterOptionParam = {
                id: ENV.QINIU_ACCESS_KEY,
                secret: ENV.QINIU_SECRET_KEY,
                isPublicCloud: true,
                preferS3Adapter: true,
            };
            // preferS3Adapter || !isPublicCloud
            opt.preferS3Adapter = true;
            expect(QiniuClientCommon.getDefaultClient(opt).constructor).toBe(S3Adapter);
            opt.isPublicCloud = false;
            MockConfigFile.mockCustomizeConfigFile();
            await getEndpointConfig({
                accessKey: ENV.QINIU_ACCESS_KEY,
                accessSecret: ENV.QINIU_SECRET_KEY,
                endpointType: EndpointType.Private,
            }).loadFromPersistence();
            expect(QiniuClientCommon.getDefaultClient(opt).constructor).toBe(S3Adapter);
            delete opt.preferS3Adapter;
            expect(QiniuClientCommon.getDefaultClient(opt).constructor).toBe(S3Adapter);
            MockConfigFile.resetConfigFile();
        });
    });

    describe("getRegionService", () => {
        it("RegionService be called", () => {
            const opt: QiniuClientCommon.GetAdapterOptionParam = {
                id: ENV.QINIU_ACCESS_KEY,
                secret: ENV.QINIU_SECRET_KEY,
                isPublicCloud: true,
            };
            QiniuClientCommon.getRegionService(opt);
            expect(RegionService).toBeCalled();
        });
    });

    describe("clearAllCache", () => {
        it("clearAllCache no err", () => {
            expect(QiniuClientCommon.clearAllCache).not.toThrow();
        });
    });
});
