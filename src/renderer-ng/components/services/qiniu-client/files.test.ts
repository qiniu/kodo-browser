import * as MockAuth from "./_mock-helpers_/auth";
import * as MockAdapter from "./_mock-helpers_/adapter";
import { transObjectInfoToFileItem } from "./_mock-helpers_/adapter";
import { mocked } from "ts-jest/utils";

jest.mock(
    "kodo-s3-adapter-sdk/dist/kodo",
    () => MockAdapter.mockAdapterFactory("Kodo"),
);
jest.mock(
    "kodo-s3-adapter-sdk/dist/s3",
    () => MockAdapter.mockAdapterFactory("S3"),
);

import * as qiniuPathConvertor from "qiniu-path/dist/src/convert";
import { Kodo as KodoAdapter } from "kodo-s3-adapter-sdk/dist/kodo";
import { S3 as S3Adapter } from "kodo-s3-adapter-sdk/dist/s3";
import {
    BatchCallback,
    Domain,
    ListedObjects,
    ListObjectsOption,
    ObjectGetResult,
    ObjectHeader,
    PartialObjectError,
    StorageClass,
    StorageObject
} from "kodo-s3-adapter-sdk/dist/adapter";

import * as QiniuClientCommon from "./common";
import * as QiniuClientFile from "./files";

describe("test qiniu-client/files.ts", () => {
    const spiedGetDefaultClient = jest.spyOn(QiniuClientCommon, "getDefaultClient");
    const MockedKodoAdapter = mocked(KodoAdapter, true);
    const MockedS3Adapter = mocked(S3Adapter, true);
    const ENV = {
        QINIU_ACCESS_KEY: MockAuth.QINIU_ACCESS_KEY,
        QINIU_SECRET_KEY: MockAuth.QINIU_SECRET_KEY,
    }
    const mockDomain: Domain = {
        name: "r06vedq0w.hd-bkt.clouddn.com",
        private: true,
        protocol: "http",
        type: "test",
    };
    const mockOpt: QiniuClientCommon.GetAdapterOptionParam = {
        id: ENV.QINIU_ACCESS_KEY,
        secret: ENV.QINIU_SECRET_KEY,
        isPublicCloud: true,
    };


    [{
        name: "Kodo",
        MockedAdapter: MockedKodoAdapter,
    }, {
        name: "S3",
        MockedAdapter: MockedS3Adapter,
    }].forEach(({
        name,
        MockedAdapter,
    }) => {
        describe(name, () => {
            beforeAll(() => {
                if (name === "Kodo") {
                    // mock public to use KodoAdapter
                    MockAuth.mockPublicAuthInfo();
                }
            });
            afterAll(() => {
                if (name === "Kodo") {
                    MockAuth.resetAuthInfo();
                }
            });
            describe("single operations", () => {
                beforeEach(() => {
                    spiedGetDefaultClient.mockClear();
                    MockedAdapter.mockClear();
                    MockedAdapter.prototype.listObjects.mockClear();
                    MockedAdapter.prototype.enter.mockClear();
                    MockedAdapter.prototype.putObject.mockClear();
                    MockedAdapter.prototype.isExists.mockClear();
                    MockedAdapter.prototype.getFrozenInfo.mockClear();
                    MockedAdapter.prototype.getObjectInfo.mockClear();
                    MockedAdapter.prototype.getObject.mockClear();
                    MockedAdapter.prototype.setObjectStorageClass.mockClear();
                    MockedAdapter.prototype.copyObject.mockClear();
                    MockedAdapter.prototype.moveObject.mockClear();
                    MockedAdapter.prototype.restoreObject.mockClear();
                });

                // listFiles
                it("test listFiles no page", async () => {
                    MockedAdapter.prototype.listObjects.mockImplementationOnce(async (
                        _domain: string,
                        _region: string,
                        _key: string,
                        _option?: ListObjectsOption
                    ): Promise<ListedObjects> => {
                        return MockAdapter.delimiterStyleTestData;
                    });
                    const actualListFilesResult = await QiniuClientFile.listFiles(
                        "region-kodo-browser-Kodo-createFolder",
                        "bucket-kodo-browser-Kodo-createFolder",
                        qiniuPathConvertor.fromQiniuPath("qiniu-client/lots-files/"),
                        undefined,
                        {
                            ...mockOpt,
                            storageClasses: [],
                        },
                    );
                    expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
                    const [ enterParamsName ] = MockedAdapter.prototype.enter.mock.calls[0];
                    expect(enterParamsName).toBe("listFiles");
                    expect(actualListFilesResult).toEqual({
                        data: MockAdapter.flatStyleTestData.objects.map(transObjectInfoToFileItem),
                    });
                });
                it("test listFiles with pagination", async () => {
                    MockedAdapter.prototype.listObjects.mockImplementationOnce(async (
                        _domain: string,
                        _region: string,
                        _key: string,
                        _option?: ListObjectsOption
                    ): Promise<ListedObjects> => {
                        return {
                            ...MockAdapter.delimiterStyleTestData,
                            nextContinuationToken: "eyJjIjowLCJrIjoibG90cy1maWxlcy9sb3RzLWZpbGVzL2ZpbGUtMDk5OSJ9",
                        };
                    });
                    const actualListFilesResult = await QiniuClientFile.listFiles(
                        "region-kodo-browser-Kodo-createFolder",
                        "bucket-kodo-browser-Kodo-createFolder",
                        qiniuPathConvertor.fromQiniuPath("qiniu-client/lots-files/"),
                        undefined,
                        {
                            ...mockOpt,
                            storageClasses: [],
                        },
                    );
                    expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
                    const [ enterParamsName ] = MockedAdapter.prototype.enter.mock.calls[0];
                    expect(enterParamsName).toBe("listFiles");
                    expect(actualListFilesResult).toEqual({
                        data: MockAdapter.flatStyleTestData.objects.map(transObjectInfoToFileItem),
                        marker: "eyJjIjowLCJrIjoibG90cy1maWxlcy9sb3RzLWZpbGVzL2ZpbGUtMDk5OSJ9",
                    });
                });

                // createFolder
                it("test createFolder", async () => {
                    await QiniuClientFile.createFolder(
                        "region-kodo-browser-Kodo-createFolder",
                        "bucket-kodo-browser-Kodo-createFolder",
                        qiniuPathConvertor.fromQiniuPath("qiniu-client/createFolder/"),
                        mockOpt,
                    );
                    expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
                    const [ enterParamsName ] = MockedAdapter.prototype.enter.mock.calls[0];
                    expect(enterParamsName).toBe("createFolder");
                    expect(MockedAdapter.prototype.putObject).toBeCalledWith(
                        "region-kodo-browser-Kodo-createFolder",
                        {
                            bucket: "bucket-kodo-browser-Kodo-createFolder",
                            key: "qiniu-client/createFolder/",
                        },
                        Buffer.alloc(0),
                        "createFolder",
                    );
                });

                // checkFileExists
                it("test checkFileExists true", async () => {
                    const isFileExists = await QiniuClientFile.checkFileExists(
                        "region-kodo-browser-Kodo-checkFileExists",
                        "bucket-kodo-browser-Kodo-checkFileExists",
                        qiniuPathConvertor.fromQiniuPath("qiniu-client/isExists/true"),
                        mockOpt,
                    );

                    expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
                    const [ enterParamsName ] = MockedAdapter.prototype.enter.mock.calls[0];
                    expect(enterParamsName).toBe("checkFileExists");
                    expect(MockedAdapter.prototype.isExists).toBeCalledWith(
                        "region-kodo-browser-Kodo-checkFileExists",
                        {
                            bucket: "bucket-kodo-browser-Kodo-checkFileExists",
                            key: "qiniu-client/isExists/true",
                        },
                    );
                    expect(isFileExists).toBeTruthy();
                });
                it("test checkFileExists false", async () => {
                    const isFileExists = await QiniuClientFile.checkFileExists(
                        "region-kodo-browser-Kodo-checkFileExists",
                        "bucket-kodo-browser-Kodo-checkFileExists",
                        qiniuPathConvertor.fromQiniuPath("qiniu-client/isExists/false"),
                        mockOpt,
                    );

                    expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
                    const [ enterParamsName ] = MockedAdapter.prototype.enter.mock.calls[0];
                    expect(enterParamsName).toBe("checkFileExists");
                    expect(MockedAdapter.prototype.isExists).toBeCalledWith(
                        "region-kodo-browser-Kodo-checkFileExists",
                        {
                            bucket: "bucket-kodo-browser-Kodo-checkFileExists",
                            key: "qiniu-client/isExists/false",
                        },
                    );
                    expect(isFileExists).toBeFalsy();
                });

                // checkFolderExists
                it("test checkFolderExists true", async () => {
                    MockedAdapter.prototype.listObjects.mockImplementationOnce(async (
                        _domain: string,
                        _region: string,
                        _key: string,
                        _option?: ListObjectsOption
                    ): Promise<ListedObjects> => {
                        return {
                            objects: MockAdapter.flatStyleTestData.objects.filter(i => i.key === "qiniu-client/dir-1/"),
                        };
                    });
                    const actualIsFolderExist = await QiniuClientFile.checkFolderExists(
                        "region-kodo-browser-Kodo-checkFolderExists",
                        "bucket-kodo-browser-Kodo-checkFolderExists",
                        qiniuPathConvertor.fromQiniuPath("qiniu-client/dir-1/"),
                        mockOpt,
                    );
                    expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
                    const [ enterParamsName ] = MockedAdapter.prototype.enter.mock.calls[0];
                    expect(enterParamsName).toBe("checkFolderExists");
                    expect(MockedAdapter.prototype.listObjects).toBeCalledWith(
                        "region-kodo-browser-Kodo-checkFolderExists",
                        "bucket-kodo-browser-Kodo-checkFolderExists",
                        "qiniu-client/dir-1/",
                        {
                            maxKeys: 1,
                        },
                    );
                    expect(actualIsFolderExist).toBeTruthy();
                });
                it("test checkFolderExists false", async () => {
                    MockedAdapter.prototype.listObjects.mockImplementationOnce(async (
                        _domain: string,
                        _region: string,
                        _key: string,
                        _option?: ListObjectsOption
                    ): Promise<ListedObjects> => {
                        return {
                            objects: MockAdapter.flatStyleTestData.objects.filter(i => i.key === "qiniu-client/dir-not-exists/"),
                        };
                    });
                    const actualIsFolderExist = await QiniuClientFile.checkFolderExists(
                        "region-kodo-browser-Kodo-checkFolderExists",
                        "bucket-kodo-browser-Kodo-checkFolderExists",
                        qiniuPathConvertor.fromQiniuPath("qiniu-client/dir-not-exists/"),
                        mockOpt,
                    );
                    expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
                    const [ enterParamsName ] = MockedAdapter.prototype.enter.mock.calls[0];
                    expect(enterParamsName).toBe("checkFolderExists");
                    expect(MockedAdapter.prototype.listObjects).toBeCalledWith(
                        "region-kodo-browser-Kodo-checkFolderExists",
                        "bucket-kodo-browser-Kodo-checkFolderExists",
                        "qiniu-client/dir-not-exists/",
                        {
                            maxKeys: 1,
                        },
                    );
                    expect(actualIsFolderExist).toBeFalsy();
                });

                // getFrozenInfo
                it("test getFrozenInfo", async () => {
                    await QiniuClientFile.getFrozenInfo(
                        "region-kodo-browser-Kodo-getFrozenInfo",
                        "bucket-kodo-browser-Kodo-getFrozenInfo",
                        qiniuPathConvertor.fromQiniuPath("qiniu-client/file-1"),
                        mockOpt,
                    );
                    expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
                    const [ enterParamsName ] = MockedAdapter.prototype.enter.mock.calls[0];
                    expect(enterParamsName).toBe("getFrozenInfo");
                    expect(MockedAdapter.prototype.getFrozenInfo).toBeCalledWith(
                        "region-kodo-browser-Kodo-getFrozenInfo",
                        {
                            bucket: "bucket-kodo-browser-Kodo-getFrozenInfo",
                            key: "qiniu-client/file-1",
                        },
                    );
                });

                // headFile
                it("test headFile", async () => {
                    await QiniuClientFile.headFile(
                        "region-kodo-browser-Kodo-headFile",
                        "bucket-kodo-browser-Kodo-headFile",
                        qiniuPathConvertor.fromQiniuPath("qiniu-client/file-1"),
                        {
                            ...mockOpt,
                            storageClasses: [],
                        },
                    );
                    expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
                    const [ enterParamsName ] = MockedAdapter.prototype.enter.mock.calls[0];
                    expect(enterParamsName).toBe("headFile");
                    expect(MockedAdapter.prototype.getObjectInfo).toBeCalledWith(
                        "region-kodo-browser-Kodo-headFile",
                        {
                            bucket: "bucket-kodo-browser-Kodo-headFile",
                            key: "qiniu-client/file-1",
                        },
                    );
                });

                // setStorageClass
                // "Standard" | "InfrequentAccess" | "Archive",
                it("test setStorageClass Standard", async () => {
                    await QiniuClientFile.setStorageClass(
                        "region-kodo-browser-Kodo-setStorageClass",
                        "bucket-kodo-browser-Kodo-setStorageClass",
                        qiniuPathConvertor.fromQiniuPath("qiniu-client/file-1"),
                        "Standard",
                        {
                            ...mockOpt,
                            storageClasses: [],
                        },
                    );
                    expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
                    const [ enterParamsName ] = MockedAdapter.prototype.enter.mock.calls[0];
                    expect(enterParamsName).toBe("setStorageClass");
                    expect(MockedAdapter.prototype.setObjectStorageClass).toBeCalledWith(
                        "region-kodo-browser-Kodo-setStorageClass",
                        {
                            bucket: "bucket-kodo-browser-Kodo-setStorageClass",
                            key: "qiniu-client/file-1",
                        },
                        "Standard",
                    );
                });
                it("test setStorageClass InfrequentAccess", async () => {
                    await QiniuClientFile.setStorageClass(
                        "region-kodo-browser-Kodo-setStorageClass",
                        "bucket-kodo-browser-Kodo-setStorageClass",
                        qiniuPathConvertor.fromQiniuPath("qiniu-client/file-1"),
                        "InfrequentAccess",
                        {
                            ...mockOpt,
                            storageClasses: [],
                        },
                    );
                    expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
                    const [ enterParamsName ] = MockedAdapter.prototype.enter.mock.calls[0];
                    expect(enterParamsName).toBe("setStorageClass");
                    expect(MockedAdapter.prototype.setObjectStorageClass).toBeCalledWith(
                        "region-kodo-browser-Kodo-setStorageClass",
                        {
                            bucket: "bucket-kodo-browser-Kodo-setStorageClass",
                            key: "qiniu-client/file-1",
                        },
                        "InfrequentAccess",
                    );
                });
                it("test setStorageClass Archive", async () => {
                    await QiniuClientFile.setStorageClass(
                        "region-kodo-browser-Kodo-setStorageClass",
                        "bucket-kodo-browser-Kodo-setStorageClass",
                        qiniuPathConvertor.fromQiniuPath("qiniu-client/file-1"),
                        "Archive",
                        {
                            ...mockOpt,
                            storageClasses: [],
                        },
                    );
                    expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
                    const [ enterParamsName ] = MockedAdapter.prototype.enter.mock.calls[0];
                    expect(enterParamsName).toBe("setStorageClass");
                    expect(MockedAdapter.prototype.setObjectStorageClass).toBeCalledWith(
                        "region-kodo-browser-Kodo-setStorageClass",
                        {
                            bucket: "bucket-kodo-browser-Kodo-setStorageClass",
                            key: "qiniu-client/file-1",
                        },
                        "Archive",
                    );
                });

                // getContent
                it("test getContent", async () => {
                    MockedAdapter.prototype.getObject.mockImplementationOnce(async (
                        _s3RegionId: string,
                        _object: StorageObject,
                        _domain?: Domain,
                    ): Promise<ObjectGetResult> => {
                        const mockData = Buffer.from("lalalala");
                        return {
                            data: mockData,
                            header: {
                                size: Buffer.byteLength(mockData),
                                lastModified: new Date("2021-11-25T06:51:30.195Z"),
                                metadata: {},
                            },
                        };
                    });
                    const actualContent = await QiniuClientFile.getContent(
                        "region-kodo-browser-Kodo-getContent",
                        "bucket-kodo-browser-Kodo-getContent",
                        qiniuPathConvertor.fromQiniuPath("qiniu-client/file-to-get"),
                        mockDomain,
                        mockOpt,
                    );
                    expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
                    const [ enterParamsName ] = MockedAdapter.prototype.enter.mock.calls[0];
                    expect(enterParamsName).toBe("getContent");
                    expect(MockedAdapter.prototype.getObject).toBeCalledWith(
                        "region-kodo-browser-Kodo-getContent",
                        {
                            bucket: "bucket-kodo-browser-Kodo-getContent",
                            key: "qiniu-client/file-to-get",
                        },
                        mockDomain,
                    );
                    expect(actualContent).toEqual(Buffer.from("lalalala"));
                });

                // saveContent
                it("test saveContent", async () => {
                    MockedAdapter.prototype.getObjectHeader.mockImplementationOnce(async (
                        _s3RegionId: string,
                        _object: StorageObject,
                        _domain?: Domain,
                    ): Promise<ObjectHeader> => {
                        return {
                            size: Buffer.byteLength(Buffer.from("lalalala")),
                            lastModified: new Date("2021-11-25T07:37:02.626Z"),
                            metadata: {
                                'kodo-browser': 'test-for-saveContent',
                            },
                        }
                    });
                    await QiniuClientFile.saveContent(
                        "region-kodo-browser-Kodo-saveContent",
                        "bucket-kodo-browser-Kodo-saveContent",
                        qiniuPathConvertor.fromQiniuPath("qiniu-client/file-to-save"),
                        Buffer.from("hahahaha"),
                        mockDomain,
                        mockOpt,
                        mockOpt,
                    );
                    expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
                    const [ enterParamsName ] = MockedAdapter.prototype.enter.mock.calls[0]
                    expect(enterParamsName).toBe("saveContent");
                    expect(MockedAdapter.prototype.getObjectHeader).toBeCalledWith(
                        "region-kodo-browser-Kodo-saveContent",
                        {
                            bucket: "bucket-kodo-browser-Kodo-saveContent",
                            key: "qiniu-client/file-to-save",
                        },
                        mockDomain,
                    );
                    expect(MockedAdapter.prototype.putObject).toBeCalledWith(
                        "region-kodo-browser-Kodo-saveContent",
                        {
                            bucket: "bucket-kodo-browser-Kodo-saveContent",
                            key: "qiniu-client/file-to-save",
                        },
                        Buffer.from("hahahaha"),
                        "file-to-save",
                        {
                            metadata: {
                                'kodo-browser': 'test-for-saveContent',
                            },
                        },
                    );
                });

                // moveOrCopyFile
                it("test moveOrCopyFile copy", async () => {
                    await QiniuClientFile.moveOrCopyFile(
                        "region-kodo-browser-Kodo-moveOrCopyFile",
                        "bucket-kodo-browser-Kodo-moveOrCopyFile",
                        qiniuPathConvertor.fromQiniuPath("qiniu-client/file-to-copy"),
                        qiniuPathConvertor.fromQiniuPath("qiniu-client/copy-to/file-to-copy"),
                        true,
                        mockOpt,
                    );
                    expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
                    const [ enterParamsName ] = MockedAdapter.prototype.enter.mock.calls[0];
                    expect(enterParamsName).toBe("moveOrCopyFile");
                    expect(MockedAdapter.prototype.copyObject).toBeCalledWith(
                        "region-kodo-browser-Kodo-moveOrCopyFile",
                        {
                            from: {
                                bucket: "bucket-kodo-browser-Kodo-moveOrCopyFile",
                                key: "qiniu-client/file-to-copy",
                            },
                            to: {
                                bucket: "bucket-kodo-browser-Kodo-moveOrCopyFile",
                                key: "qiniu-client/copy-to/file-to-copy",
                            },
                        },
                    );
                    expect(MockedAdapter.prototype.moveObject).not.toBeCalled();
                });
                it("test moveOrCopyFile move", async () => {
                    await QiniuClientFile.moveOrCopyFile(
                        "region-kodo-browser-Kodo-moveOrCopyFile",
                        "bucket-kodo-browser-Kodo-moveOrCopyFile",
                        qiniuPathConvertor.fromQiniuPath("qiniu-client/file-to-move"),
                        qiniuPathConvertor.fromQiniuPath("qiniu-client/move-to/file-to-move"),
                        false,
                        mockOpt,
                    );
                    expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
                    const [ enterParamsName ] = MockedAdapter.prototype.enter.mock.calls[0];
                    expect(enterParamsName).toBe("moveOrCopyFile");
                    expect(MockedAdapter.prototype.moveObject).toBeCalledWith(
                        "region-kodo-browser-Kodo-moveOrCopyFile",
                        {
                            from: {
                                bucket: "bucket-kodo-browser-Kodo-moveOrCopyFile",
                                key: "qiniu-client/file-to-move",
                            },
                            to: {
                                bucket: "bucket-kodo-browser-Kodo-moveOrCopyFile",
                                key: "qiniu-client/move-to/file-to-move",
                            },
                        },
                    );
                    expect(MockedAdapter.prototype.copyObject).not.toBeCalled();
                });

                // restoreFile
                it("test restoreFile", async () => {
                    await QiniuClientFile.restoreFile(
                        "region-kodo-browser-Kodo-restoreFile",
                        "bucket-kodo-browser-Kodo-restoreFile",
                        qiniuPathConvertor.fromQiniuPath("qiniu-client/file-to-restore"),
                        3,
                        mockOpt,
                    );
                    expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
                    const [ enterParamsName ] = MockedAdapter.prototype.enter.mock.calls[0];
                    expect(enterParamsName).toBe("restoreFile");
                    expect(MockedAdapter.prototype.restoreObject).toBeCalledWith(
                        "region-kodo-browser-Kodo-restoreFile",
                        {
                            bucket: "bucket-kodo-browser-Kodo-restoreFile",
                            key: "qiniu-client/file-to-restore",
                        },
                        3,
                    );
                });
            });

            describe("batch operations", () => {
                beforeEach(() => {
                    spiedGetDefaultClient.mockClear();
                    MockedAdapter.mockClear();
                    MockedAdapter.prototype.listObjects.mockReset();
                    MockedAdapter.prototype.enter.mockClear();
                    MockedAdapter.prototype.setObjectsStorageClass.mockClear();
                    MockedAdapter.prototype.copyObjects.mockClear();
                    MockedAdapter.prototype.moveObjects.mockClear();
                    MockedAdapter.prototype.restoreObjects.mockClear();
                    MockedAdapter.prototype.deleteObjects.mockClear();
                });
                // setStorageClassOfFiles
                it("setStorageClassOfFiles", async () => {
                    // prepare mock data and mock function
                    const mockData = new MockAdapter.MockDataOfBatchOperation();

                    // mock get object list
                    MockedAdapter.prototype.listObjects.mockImplementation(async (
                        _domain: string,
                        _region: string,
                        _key: string,
                        _option?: ListObjectsOption
                    ): Promise<ListedObjects> => {
                        return mockData.listedObjects;
                    });

                    // mock progress callback
                    let actualItemsTotal = 0;
                    let actualItemsProcessed = 0;
                    const mockHandleProgress = jest.fn((p: QiniuClientFile.Progress) => {
                        actualItemsTotal = p.total;
                        actualItemsProcessed = p.current;
                    });
                    const mockHandleErr = jest.fn();

                    // mock client.prototype.setObjectsStorageClass
                    MockedAdapter.prototype.setObjectsStorageClass.mockImplementation(
                        async (
                            _s3RegionId: string,
                            _bucket: string,
                            keys: string[],
                            _storageClass: StorageClass["kodoName"],
                            callback?: BatchCallback
                        ): Promise<PartialObjectError[]> => {
                            keys.forEach((_, i) => callback && callback(i));
                            return [];
                        }
                    );

                    // test
                    await QiniuClientFile.setStorageClassOfFiles(
                        "region-kodo-browser-Kodo-setStorageClassOfFiles",
                        "bucket-kodo-browser-Kodo-setStorageClassOfFiles",
                        mockData.initObjects.map(transObjectInfoToFileItem),
                        "Standard",
                        mockHandleProgress,
                        mockHandleErr,
                        {
                            ...mockOpt,
                            storageClasses: [],
                        },
                    );
                    expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
                    const [ enterParamsName ] = MockedAdapter.prototype.enter.mock.calls[0];
                    expect(enterParamsName).toBe("setStorageClassOfFiles");
                    // next line, +1 is for handling mockData.initObjects
                    expect(MockedAdapter.prototype.setObjectsStorageClass).toBeCalledTimes(mockData.pageNum + 1);

                    // setStorageClassOfFiles not process folder
                    const expectItemsTotal = mockData.items.filter(i => !i.key.endsWith("/")).length;
                    expect(mockHandleProgress).toBeCalledTimes(
                        mockData.pageNum + 1 // expectHandleProgressByTotal, +1 for mockData.initObjects
                        + expectItemsTotal // expectHandleProgressByItems
                        + 1 // for handling progress init data
                    );
                    expect(mockHandleErr).not.toBeCalled();
                    expect(actualItemsTotal).toBe(expectItemsTotal);
                    expect(actualItemsProcessed).toBe(expectItemsTotal);
                });
                // restoreFiles
                it("restoreFiles", async () => {
                    // prepare mock data and mock function
                    const mockData = new MockAdapter.MockDataOfBatchOperation();

                    // mock get object list
                    MockedAdapter.prototype.listObjects.mockImplementation(async (
                        _domain: string,
                        _region: string,
                        _key: string,
                        _option?: ListObjectsOption
                    ): Promise<ListedObjects> => {
                        return mockData.listedObjects;
                    });

                    // mock progress callback
                    let actualItemsTotal = 0;
                    let actualItemsProcessed = 0;
                    const mockHandleProgress = jest.fn((p: QiniuClientFile.Progress) => {
                        actualItemsTotal = p.total;
                        actualItemsProcessed = p.current;
                    });
                    const mockHandleErr = jest.fn();

                    // mock client.prototype.restoreObjects
                    MockedAdapter.prototype.restoreObjects.mockImplementation(
                        async (
                            _s3RegionId: string,
                            _bucket: string,
                            keys: string[],
                            _days: number,
                            callback?: BatchCallback
                        ): Promise<PartialObjectError[]> => {
                            keys.forEach((_, i) => callback && callback(i));
                            return [];
                        }
                    );

                    // test
                    await QiniuClientFile.restoreFiles(
                        "region-kodo-browser-Kodo-restoreFiles",
                        "bucket-kodo-browser-Kodo-restoreFiles",
                        mockData.initObjects.map(transObjectInfoToFileItem),
                        3,
                        mockHandleProgress,
                        mockHandleErr,
                        {
                            ...mockOpt,
                            storageClasses: [],
                        },
                    );
                    expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
                    const [ enterParamsName ] = MockedAdapter.prototype.enter.mock.calls[0];
                    expect(enterParamsName).toBe("restoreFiles");
                    // next line, +1 is for handling mockData.initObjects
                    expect(MockedAdapter.prototype.restoreObjects).toBeCalledTimes(mockData.pageNum + 1);

                    // restoreFiles not process folder
                    const expectItemsTotal = mockData.items.filter(i => !i.key.endsWith("/")).length;
                    expect(mockHandleProgress).toBeCalledTimes(
                        mockData.pageNum + 1 // expectHandleProgressByTotal, +1 for mockData.initObjects
                        + expectItemsTotal // expectHandleProgressByItems
                        + 1 // for handling progress init data
                    );
                    expect(mockHandleErr).not.toBeCalled();
                    expect(actualItemsTotal).toBe(expectItemsTotal);
                    expect(actualItemsProcessed).toBe(expectItemsTotal);
                });

                // deleteFiles
                it("deleteFiles", async () => {
                    // prepare mock data and mock function
                    const mockData = new MockAdapter.MockDataOfBatchOperation();

                    // mock get object list
                    MockedAdapter.prototype.listObjects.mockImplementation(async (
                        _domain: string,
                        _region: string,
                        _key: string,
                        _option?: ListObjectsOption
                    ): Promise<ListedObjects> => {
                        return mockData.listedObjects;
                    });

                    // mock progress callback
                    let actualItemsTotal = 0;
                    let actualItemsProcessed = 0;
                    const mockHandleProgress = jest.fn((p: QiniuClientFile.Progress) => {
                        actualItemsTotal = p.total;
                        actualItemsProcessed = p.current;
                    });
                    const mockHandleErr = jest.fn();

                    // mock client.prototype.setObjectsStorageClass
                    MockedAdapter.prototype.deleteObjects.mockImplementation(
                        async (
                            _region: string,
                            _bucket: string,
                            keys: string[],
                            callback?: BatchCallback,
                        ): Promise<PartialObjectError[]> => {
                            keys.forEach((_, i) => callback && callback(i));
                            return [];
                        }
                    );

                    // test
                    await QiniuClientFile.deleteFiles(
                        "region-kodo-browser-Kodo-deleteFiles",
                        "bucket-kodo-browser-Kodo-deleteFiles",
                        mockData.initObjects.map(transObjectInfoToFileItem),
                        mockHandleProgress,
                        mockHandleErr,
                        {
                            ...mockOpt,
                            storageClasses: [],
                        },
                    );
                    expect(QiniuClientCommon.getDefaultClient).toBeCalledTimes(1);
                    const [ enterParamsName ] = MockedAdapter.prototype.enter.mock.calls[0];
                    expect(enterParamsName).toBe("deleteFiles");
                    // next statement, +2 is for:
                    // +1 handling mockData.initObjects
                    // +1 handling directory of mockData.initObjects
                    expect(MockedAdapter.prototype.deleteObjects).toBeCalledTimes(mockData.pageNum + 2);


                    const expectItemsTotal = mockData.items.length;
                    expect(mockHandleProgress).toBeCalledTimes(
                        mockData.pageNum + mockData.subDirNum + 1 // expectHandleProgressByTotal, +1 for mockData.initObjects
                        + expectItemsTotal // expectHandleProgressByItems
                        + 1 // for handling progress init data
                    );
                    expect(mockHandleErr).not.toBeCalled();
                    // next line +1 for handling directory of mockData.initObjects
                    expect(actualItemsTotal).toBe(expectItemsTotal);
                    expect(actualItemsProcessed).toBe(expectItemsTotal);
                });
            });
        });
    });

});
