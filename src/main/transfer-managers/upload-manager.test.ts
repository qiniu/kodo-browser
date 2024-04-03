import * as MockAdapter from "@common/qiniu/_mock-helpers_/adapter";
import {mockUploader} from "@common/qiniu/_mock-helpers_/uploader";

jest.mock(
    "kodo-s3-adapter-sdk/dist/kodo",
    () => MockAdapter.mockAdapterFactory("Kodo"),
);
jest.mock("kodo-s3-adapter-sdk", () => mockUploader());

import path from "path";

import mockFs from "mock-fs";
import {mocked} from "ts-jest/utils";
import {Kodo as KodoAdapter} from "kodo-s3-adapter-sdk/dist/kodo";

import * as MockAuth from "@common/qiniu/_mock-helpers_/auth";
import {UploadOptions} from "@common/ipc-actions/upload";
import {BackendMode, ClientOptions} from "@common/qiniu";
import {LocalPath, RemotePath} from "@common/models/job/types";
import UploadJob from "@common/models/job/upload-job";

import UploadManager, {UploadManagerConfig} from "./upload-manager";

jest.mock("@common/models/job/upload-job");
const MockedUploadJob = mocked(UploadJob, true);
const MockedKodoAdapter = mocked(KodoAdapter, true);

interface ExpectFrom {
  name: string,
  path: string,
}

interface ExpectTo {
  key: string,
}

interface ExpectFile {
  from: ExpectFrom,
  to: ExpectTo,
}

interface ActualFile {
  from: Required<LocalPath>,
  to: RemotePath,
}

interface ExpectDir {
  key: string,
}

interface ActualDir {
  bucket: string,
  key: string,
}

describe("test createUploadJobs", () => {
  const DEFAULT_UPLOAD_MANAGER_CONFIG: UploadManagerConfig = {
    isDebug: false,
    isSkipEmptyDirectory: false,
    persistPath: "",
    resumable: false,
    multipartConcurrency: 5,
  };

  const MOCKED_CLIENT_OPTIONS: ClientOptions = {
    accessKey: MockAuth.QINIU_ACCESS_KEY,
    secretKey: MockAuth.QINIU_SECRET_KEY,
    ucUrl: MockAuth.QINIU_UC,
    regions: [],
    backendMode: BackendMode.Kodo,
  };

  const MOCKED_UPLOAD_OPTIONS: UploadOptions = {
    isOverwrite: true,
    storageClassName: "Standard",
    storageClasses: [
      {
        fileType: 1,
        kodoName: "Standard",
        s3Name: "STANDARD",
        nameI18n: {},
        billingI18n: {},
      },
    ],
    userNatureLanguage: "zh-CN"
  };

  function checkFiles(
    actualFiles: ActualFile[],
    expectFiles: ExpectFile[],
    expectBucket: string,
  ) {
    expect(actualFiles).toEqual(
      expect.arrayContaining(
        expectFiles.map(f => expect.objectContaining({
          from: expect.objectContaining(f.from),
          to: expect.objectContaining({
            ...f.to,
            bucket: expectBucket,
          }),
        }))
      )
    );
  }

  function checkDirs(
    actualDirs: ActualDir[],
    expectDirs: ExpectDir[],
    expectBucket: string,
  ) {
    expect(actualDirs).toEqual(
      expect.arrayContaining(
        expectDirs.map(d => expect.objectContaining({
          ...d,
          bucket: expectBucket,
        }))
      )
    )
  }

  beforeEach(() => {
    MockedKodoAdapter.mockClear();
    MockedUploadJob.mockClear();
  })

  afterEach(() => {
    mockFs.restore();
  });

  it("test createUploadJobs from local root to remote root", async () => {
    mockFs({
      "/abc": "some data",
      "/bar": {
        "foo1": "some data1",
        "foo2": "some data2",
      },
    });

    const mockedFilePaths = [
      `${path.sep}abc`,
      `${path.sep}bar`,
    ];
    const mockedDestInfo = {
      regionId: "mocked-region",
      bucketName: "mocked-bucket",
      key: "",
    };
    const uploadManager = new UploadManager(DEFAULT_UPLOAD_MANAGER_CONFIG);
    await uploadManager.createUploadJobs(
      mockedFilePaths,
      mockedDestInfo,
      MOCKED_CLIENT_OPTIONS,
      MOCKED_UPLOAD_OPTIONS,
    );

    const uploadJobInstanceOptions = MockedUploadJob.mock.calls.map(([options]) => options);
    const expectFiles: ExpectFile[] = [
      {
        from: {
          name: "abc",
          path: `${path.sep}abc`,
        },
        to: {
          key: "abc",
        },
      },
      {
        from: {
          name: "foo1",
          path: `${path.sep}${path.join("bar", "foo1")}`,
        },
        to: {
          key: "bar/foo1",
        },
      },
      {
        from: {
          name: "foo2",
          path: `${path.sep}${path.join("bar", "foo2")}`,
        },
        to: {
          key: "bar/foo2",
        },
      },
    ];
    checkFiles(
      uploadJobInstanceOptions.map(o => ({
        from: o.from,
        to: o.to,
      })),
      expectFiles,
      mockedDestInfo.bucketName,
    );
    const expectDirs: ExpectDir[] = [
      {
        key: "bar/",
      },
    ];

    const createDirPutCalls = MockedKodoAdapter.prototype.putObject.mock.calls.map(
      ([_region, dir, _content, _dirname]) => ({
        ...dir,
      })
    );
    checkDirs(createDirPutCalls, expectDirs, mockedDestInfo.bucketName);
  });

  it("test createUploadJobs from local root to remote directory", async () => {
    mockFs({
      "/abc": "some data",
      "/bar": {
        "foo1": "some data1",
        "foo2": "some data2",
      },
    });

    const mockedFilePaths = [
      `${path.sep}abc`,
      `${path.sep}bar`,
    ];
    const mockedDestInfo = {
      regionId: "mocked-region",
      bucketName: "mocked-bucket",
      key: "remote-dir/",
    };
    const uploadManager = new UploadManager(DEFAULT_UPLOAD_MANAGER_CONFIG);
    await uploadManager.createUploadJobs(
      mockedFilePaths,
      mockedDestInfo,
      MOCKED_CLIENT_OPTIONS,
      MOCKED_UPLOAD_OPTIONS
    );

    const uploadJobInstanceOptions = MockedUploadJob.mock.calls.map(([options]) => options);
    const expectFiles: ExpectFile[] = [
      {
        from: {
          name: "abc",
          path: `${path.sep}abc`,
        },
        to: {
          key: "remote-dir/abc",
        },
      },
      {
        from: {
          name: "foo1",
          path: `${path.sep}${path.join("bar", "foo1")}`,
        },
        to: {
          key: "remote-dir/bar/foo1",
        },
      },
      {
        from: {
          name: "foo2",
          path: `${path.sep}${path.join("bar", "foo2")}`,
        },
        to: {
          key: "remote-dir/bar/foo2",
        },
      },
    ];
    checkFiles(
      uploadJobInstanceOptions.map(o => ({
        from: o.from,
        to: o.to,
      })),
      expectFiles,
      mockedDestInfo.bucketName,
    );
    const expectDirs: ExpectDir[] = [
      {
        key: "remote-dir/bar/",
      },
    ];

    const createDirPutCalls = MockedKodoAdapter.prototype.putObject.mock.calls.map(
      ([_region, dir, _content, _dirname]) => ({
        ...dir,
      })
    );
    checkDirs(createDirPutCalls, expectDirs, mockedDestInfo.bucketName);
  });

  it("test createUploadJobs from local directory to remote root", async () => {
    mockFs({
      "/local-dir": {
        "abc": "some data",
        "bar": {
          "foo1": "some data1",
          "foo2": "some data2",
        },
      },
    });

    const mockedFilePaths = [
      `${path.sep}${path.join("local-dir", "abc")}`,
      `${path.sep}${path.join("local-dir", "bar")}`,
    ];
    const mockedDestInfo = {
      regionId: "mocked-region",
      bucketName: "mocked-bucket",
      key: "",
    };
    const uploadManager = new UploadManager(DEFAULT_UPLOAD_MANAGER_CONFIG);
    await uploadManager.createUploadJobs(
      mockedFilePaths,
      mockedDestInfo,
      MOCKED_CLIENT_OPTIONS,
      MOCKED_UPLOAD_OPTIONS
    );

    const uploadJobInstanceOptions = MockedUploadJob.mock.calls.map(([options]) => options);
    const expectFiles: ExpectFile[] = [
      {
        from: {
          name: "abc",
          path: `${path.sep}${path.join("local-dir", "abc")}`,
        },
        to: {
          key: "abc",
        },
      },
      {
        from: {
          name: "foo1",
          path: `${path.sep}${path.join("local-dir", "bar", "foo1")}`,
        },
        to: {
          key: "bar/foo1",
        },
      },
      {
        from: {
          name: "foo2",
          path: `${path.sep}${path.join("local-dir", "bar", "foo2")}`,
        },
        to: {
          key: "bar/foo2",
        },
      },
    ];
    checkFiles(
      uploadJobInstanceOptions.map(o => ({
        from: o.from,
        to: o.to,
      })),
      expectFiles,
      mockedDestInfo.bucketName,
    );
    const expectDirs: ExpectDir[] = [
      {
        key: "bar/",
      },
    ];

    const createDirPutCalls = MockedKodoAdapter.prototype.putObject.mock.calls.map(
      ([_region, dir, _content, _dirname]) => ({
        ...dir,
      })
    );
    checkDirs(createDirPutCalls, expectDirs, mockedDestInfo.bucketName);
  });

  it("test createUploadJobs from local directory to remote directory", async () => {
    mockFs({
      "/local-dir": {
        "abc": "some data",
        "bar": {
          "foo1": "some data1",
          "foo2": "some data2",
        },
      },
    });

    const mockedFilePaths = [
      `${path.sep}${path.join("local-dir", "abc")}`,
      `${path.sep}${path.join("local-dir", "bar")}`,
    ];
    const mockedDestInfo = {
      regionId: "mocked-region",
      bucketName: "mocked-bucket",
      key: "remote-dir/",
    };
    const uploadManager = new UploadManager(DEFAULT_UPLOAD_MANAGER_CONFIG);
    await uploadManager.createUploadJobs(
      mockedFilePaths,
      mockedDestInfo,
      MOCKED_CLIENT_OPTIONS,
      MOCKED_UPLOAD_OPTIONS
    );

    const uploadJobInstanceOptions = MockedUploadJob.mock.calls.map(([options]) => options);
    const expectFiles: ExpectFile[] = [
      {
        from: {
          name: "abc",
          path: `${path.sep}${path.join("local-dir", "abc")}`,
        },
        to: {
          key: "remote-dir/abc",
        },
      },
      {
        from: {
          name: "foo1",
          path: `${path.sep}${path.join("local-dir", "bar", "foo1")}`,
        },
        to: {
          key: "remote-dir/bar/foo1",
        },
      },
      {
        from: {
          name: "foo2",
          path: `${path.sep}${path.join("local-dir", "bar", "foo2")}`,
        },
        to: {
          key: "remote-dir/bar/foo2",
        },
      },
    ];
    checkFiles(
      uploadJobInstanceOptions.map(o => ({
        from: o.from,
        to: o.to,
      })),
      expectFiles,
      mockedDestInfo.bucketName,
    );
    const expectDirs: ExpectDir[] = [
      {
        key: "remote-dir/bar/",
      },
    ];

    const createDirPutCalls = MockedKodoAdapter.prototype.putObject.mock.calls.map(
      ([_region, dir, _content, _dirname]) => ({
        ...dir,
      })
    );
    checkDirs(createDirPutCalls, expectDirs, mockedDestInfo.bucketName);
  });

  it("test createUploadJobs from local root to remote empty name directory", async () => {
    mockFs({
      "/abc": "some data",
      "/bar": {
        "foo1": "some data1",
        "foo2": "some data2",
      },
    });

    const mockedFilePaths = [
      `${path.sep}abc`,
      `${path.sep}bar`,
    ];
    const mockedDestInfo = {
      regionId: "mocked-region",
      bucketName: "mocked-bucket",
      key: "/",
    };
    const uploadManager = new UploadManager(DEFAULT_UPLOAD_MANAGER_CONFIG);
    await uploadManager.createUploadJobs(
      mockedFilePaths,
      mockedDestInfo,
      MOCKED_CLIENT_OPTIONS,
      MOCKED_UPLOAD_OPTIONS
    );

    const uploadJobInstanceOptions = MockedUploadJob.mock.calls.map(([options]) => options);
    const expectFiles: ExpectFile[] = [
      {
        from: {
          name: "abc",
          path: `${path.sep}abc`,
        },
        to: {
          key: "/abc",
        },
      },
      {
        from: {
          name: "foo1",
          path: `${path.sep}${path.join("bar", "foo1")}`,
        },
        to: {
          key: "/bar/foo1",
        },
      },
      {
        from: {
          name: "foo2",
          path: `${path.sep}${path.join("bar", "foo2")}`,
        },
        to: {
          key: "/bar/foo2",
        },
      },
    ];
    checkFiles(
      uploadJobInstanceOptions,
      expectFiles,
      mockedDestInfo.bucketName,
    );
    const expectDirs: ExpectDir[] = [
      {
        key: "/bar/",
      },
    ];

    const createDirPutCalls = MockedKodoAdapter.prototype.putObject.mock.calls.map(
      ([_region, dir, _content, _dirname]) => ({
        ...dir,
      })
    );
    checkDirs(createDirPutCalls, expectDirs, mockedDestInfo.bucketName);
  });

  it("test createUploadJobs from local directory to remote nested empty name directory", async () => {
    mockFs({
      "/local-dir": {
        "abc": "some data",
        "bar": {
          "foo1": "some data1",
          "foo2": "some data2",
        },
      },
    });

    const mockedFilePaths = [
      `${path.sep}${path.join("local-dir", "abc")}`,
      `${path.sep}${path.join("local-dir", "bar")}`,
    ];
    const mockedDestInfo = {
      regionId: "mocked-region",
      bucketName: "mocked-bucket",
      key: "abc//xyz",
    };
    const uploadManager = new UploadManager(DEFAULT_UPLOAD_MANAGER_CONFIG);
    await uploadManager.createUploadJobs(
      mockedFilePaths,
      mockedDestInfo,
      MOCKED_CLIENT_OPTIONS,
      MOCKED_UPLOAD_OPTIONS
    );

    const uploadJobInstanceOptions = MockedUploadJob.mock.calls.map(([options]) => options);
    const expectFiles: ExpectFile[] = [
      {
        from: {
          name: "abc",
          path: `${path.sep}${path.join("local-dir", "abc")}`,
        },
        to: {
          key: "abc//xyz/abc",
        },
      },
      {
        from: {
          name: "foo1",
          path: `${path.sep}${path.join("local-dir", "bar", "foo1")}`,
        },
        to: {
          key: "abc//xyz/bar/foo1",
        },
      },
      {
        from: {
          name: "foo2",
          path: `${path.sep}${path.join("local-dir", "bar", "foo2")}`,
        },
        to: {
          key: "abc//xyz/bar/foo2",
        },
      },
    ];
    checkFiles(
      uploadJobInstanceOptions.map(o => ({
        from: o.from,
        to: o.to,
      })),
      expectFiles,
      mockedDestInfo.bucketName,
    );
    const expectDirs: ExpectDir[] = [
      {
        key: "abc//xyz/bar/",
      },
    ];

    const createDirPutCalls = MockedKodoAdapter.prototype.putObject.mock.calls.map(
      ([_region, dir, _content, _dirname]) => ({
        ...dir,
      })
    );
    checkDirs(createDirPutCalls, expectDirs, mockedDestInfo.bucketName);
  });
});
