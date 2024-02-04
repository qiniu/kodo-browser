import * as MockAdapter from "@common/qiniu/_mock-helpers_/adapter";

jest.mock(
  "kodo-s3-adapter-sdk/dist/kodo",
  () => MockAdapter.mockAdapterFactory("Kodo"),
);

import {
  mockDownloader,
  MockDownloadContent,
} from "@common/qiniu/_mock-helpers_/downloader";

jest.mock("kodo-s3-adapter-sdk", () => mockDownloader());

import path from "path";
import fsPromises from "fs/promises";

import FileSystem from "mock-fs/lib/filesystem";
import mockFs from "mock-fs";
import {mocked} from "ts-jest/utils";
import {ListedObjects} from "kodo-s3-adapter-sdk/dist/adapter";
import {Kodo as KodoAdapter} from "kodo-s3-adapter-sdk/dist/kodo";

import * as MockAuth from "@common/qiniu/_mock-helpers_/auth";
import {DownloadOptions, RemoteObject} from "@common/ipc-actions/download";
import {BackendMode, ClientOptions} from "@common/qiniu";
import {LocalPath, RemotePath} from "@common/models/job/types";
import DownloadJob from "@common/models/job/download-job";

import DownloadManager, {DownloadManagerConfig} from "./download-manager";

jest.mock("@common/models/job/download-job");
const MockedDownloadJob = mocked(DownloadJob, true);
const MockedKodoAdapter = mocked(KodoAdapter, true);

interface ExpectFrom {
  key: string,
}

interface ExpectTo {
  name: string,
  path: string,
}

interface ExpectFile {
  from: ExpectFrom,
  to: ExpectTo,
}

interface ActualFile {
  from: Required<RemotePath>,
  to: LocalPath,
}

describe("test createDownloadJobs", () => {
  const DEFAULT_UPLOAD_MANAGER_CONFIG: DownloadManagerConfig = {
    isDebug: false,
    isOverwrite: true,
    persistPath: "",
    resumable: false
  };

  const MOCKED_BUCKET = "mocked-bucket";

  const MOCKED_CLIENT_OPTIONS: ClientOptions = {
    accessKey: MockAuth.QINIU_ACCESS_KEY,
    secretKey: MockAuth.QINIU_SECRET_KEY,
    ucUrl: MockAuth.QINIU_UC,
    regions: [],
    backendMode: BackendMode.Kodo,
  };

  const MOCKED_DOWNLOAD_OPTIONS: DownloadOptions = {
    bucket: MOCKED_BUCKET,
    region: "mocked-region",
    isOverwrite: true,
    storageClasses: [
      {
        fileType: 1,
        kodoName: "Standard",
        s3Name: "STANDARD",
        nameI18n: {},
        billingI18n: {},
      },
    ],
    userNatureLanguage: "zh-CN",
  };

  interface CreateMockRemoteObjectOptions {
    bucket: string,
    key: string,
    mtime?: number,
  }

  function createMockRemoteObject({
    bucket,
    key,
    mtime = Date.now(),
  }: CreateMockRemoteObjectOptions): RemoteObject {
    const isDir = key.endsWith("/");
    return {
      bucket,
      key,
      mtime: mtime,
      isDirectory: isDir,
      isFile: !isDir,
      name: path.posix.basename(key),
      region: "mocked-region",
      size: Buffer.from(MockDownloadContent).length,
    };
  }

  const MOCKED_EMPTY_NAME_DIR = "__empty__";
  function mockListObjects(items: FileSystem.DirectoryItems) {
    mockFs({
      "/mock-remote": items,
    });
    MockedKodoAdapter.prototype.listObjects.mockImplementation(async (_regionId, bucket, prefix) => {
      // use `__empty__` to mock empty name dir,
      // for example
      // `//` -> `__empty__/__empty__/`
      // `/` -> `__empty__/`
      // `abc//` -> `abc/__empty__/`
      const p = path.join(
        `${path.sep}mock-remote`,
        prefix.split(path.posix.sep)
          .map((s, i, arr) =>
            (!s && i < arr.length - 1) ? MOCKED_EMPTY_NAME_DIR : s)
          .join(path.sep)
      );
      const items = await fsPromises.readdir(
        p,
        {withFileTypes: true}
      );
      const result: ListedObjects = {
        objects: [],
        commonPrefixes: [],
      };
      for (const item of items) {
        if (item.isFile()) {
          let itemPath = path.join(p, item.name);
          const itemStat = await fsPromises.stat(itemPath);
          result.objects.push({
            bucket: bucket,
            key: `${prefix}${item.name}`,
            storageClass: "Standard",
            size: itemStat.size,
            lastModified: itemStat.mtime,
          });
        } else if (item.isDirectory()) {
          const name = item.name === MOCKED_EMPTY_NAME_DIR
            ? ""
            : item.name
          result.commonPrefixes?.push({
            bucket,
            key: `${prefix}${name}/`
          });
        }
      }
      return result;
    });
  }

  function checkFiles(
    actualFiles: ActualFile[],
    expectFiles: ExpectFile[],
    expectBucket: string,
  ) {
    expect(actualFiles).toEqual(
      expect.arrayContaining(
        expectFiles.map(f => expect.objectContaining({
          from: expect.objectContaining({
            ...f.from,
            bucket: expectBucket,
          }),
          to: expect.objectContaining(f.to),
        }))
      )
    );
  }

  beforeEach(() => {
    mockFs();
    MockedKodoAdapter.mockClear();
    MockedDownloadJob.mockClear();
  })

  afterEach(() => {
    mockFs.restore();
  });

  it("test createDownloadJobs from remote root to local root", async () => {
    mockListObjects({
      "abc": "some data",
      "bar": {
        "foo1": "some data1",
        "foo2": "some data2",
      },
    });
    const mockedRemoteObjects = [
      "abc",
      "bar/",
    ].map(p => createMockRemoteObject({
      bucket: MOCKED_BUCKET,
      key: p,
    }));
    const mockedDestPath: string = path.sep;
    const downloadManager = new DownloadManager(DEFAULT_UPLOAD_MANAGER_CONFIG);
    await downloadManager.createDownloadJobs(
      mockedRemoteObjects,
      mockedDestPath,
      MOCKED_CLIENT_OPTIONS,
      MOCKED_DOWNLOAD_OPTIONS,
    );

    const downloadJobInstanceOptions = MockedDownloadJob.mock.calls.map(([options]) => options);
    const expectFiles: ExpectFile[] = [
      {
        to: {
          name: "abc",
          path: `${path.sep}abc`,
        },
        from: {
          key: "abc",
        },
      },
      {
        to: {
          name: "foo1",
          path: `${path.sep}${path.join("bar", "foo1")}`,
        },
        from: {
          key: "bar/foo1",
        },
      },
      {
        to: {
          name: "foo2",
          path: `${path.sep}${path.join("bar", "foo2")}`,
        },
        from: {
          key: "bar/foo2",
        },
      },
    ];
    checkFiles(
      downloadJobInstanceOptions
        .map(o => ({
          from: o.from,
          to: o.to,
        })),
      expectFiles,
      MOCKED_BUCKET,
    );
  });

  it("test createDownloadJobs from remote root to local directory", async () => {
    mockListObjects({
      "abc": "some data",
      "bar": {
        "foo1": "some data1",
        "foo2": "some data2",
      },
    });
    const mockedRemoteObjects = [
      "abc",
      "bar/",
    ].map(p => createMockRemoteObject({
      bucket: MOCKED_BUCKET,
      key: p,
    }));
    const mockedDestPath: string = `${path.sep}local-dir`;
    const downloadManager = new DownloadManager(DEFAULT_UPLOAD_MANAGER_CONFIG);
    await downloadManager.createDownloadJobs(
      mockedRemoteObjects,
      mockedDestPath,
      MOCKED_CLIENT_OPTIONS,
      MOCKED_DOWNLOAD_OPTIONS
    );

    const downloadJobInstanceOptions = MockedDownloadJob.mock.calls.map(([options]) => options);
    const expectFiles: ExpectFile[] = [
      {
        to: {
          name: "abc",
          path: `${path.sep}${path.join("local-dir", "abc")}`,
        },
        from: {
          key: "abc",
        },
      },
      {
        to: {
          name: "foo1",
          path: `${path.sep}${path.join("local-dir", "bar", "foo1")}`,
        },
        from: {
          key: "bar/foo1",
        },
      },
      {
        to: {
          name: "foo2",
          path: `${path.sep}${path.join("local-dir", "bar", "foo2")}`,
        },
        from: {
          key: "bar/foo2",
        },
      },
    ];
    checkFiles(
      downloadJobInstanceOptions
        .map(o => ({
          from: o.from,
          to: o.to,
        })),
      expectFiles,
      MOCKED_BUCKET,
    );
  });

  it("test createDownloadJobs from remote directory to local root", async () => {
    mockListObjects({
      "remote-dir": {
        "abc": "some data",
        "bar": {
          "foo1": "some data1",
          "foo2": "some data2",
        },
      },
    });

    const mockedRemoteObjects = [
      "remote-dir/abc",
      "remote-dir/bar/",
    ].map(p => createMockRemoteObject({
      bucket: MOCKED_BUCKET,
      key: p,
    }));
    const mockedDestPath: string = path.sep;
    const downloadManager = new DownloadManager(DEFAULT_UPLOAD_MANAGER_CONFIG);
    await downloadManager.createDownloadJobs(
      mockedRemoteObjects,
      mockedDestPath,
      MOCKED_CLIENT_OPTIONS,
      MOCKED_DOWNLOAD_OPTIONS
    );

    const downloadJobInstanceOptions = MockedDownloadJob.mock.calls.map(([options]) => options);
    const expectFiles: ExpectFile[] = [
      {
        to: {
          name: "abc",
          path: `${path.sep}abc`,
        },
        from: {
          key: "remote-dir/abc",
        },
      },
      {
        to: {
          name: "foo1",
          path: `${path.sep}${path.join("bar", "foo1")}`,
        },
        from: {
          key: "remote-dir/bar/foo1",
        },
      },
      {
        to: {
          name: "foo2",
          path: `${path.sep}${path.join("bar", "foo2")}`,
        },
        from: {
          key: "remote-dir/bar/foo2",
        },
      },
      //
    ];
    checkFiles(
      downloadJobInstanceOptions
        .map(o => ({
          from: o.from,
          to: o.to,
        })),
      expectFiles,
      MOCKED_BUCKET,
    );
  });

  it("test createDownloadJobs from remote directory to local directory", async () => {
    mockListObjects({
      "remote-dir": {
        "abc": "some data",
        "bar": {
          "foo1": "some data1",
          "foo2": "some data2",
        },
      },
    });

    const mockedRemoteObjects = [
      "remote-dir/abc",
      "remote-dir/bar/",
    ].map(p => createMockRemoteObject({
      bucket: MOCKED_BUCKET,
      key: p,
    }));
    const mockedDestPath: string = `${path.sep}local-dir`;
    const downloadManager = new DownloadManager(DEFAULT_UPLOAD_MANAGER_CONFIG);
    await downloadManager.createDownloadJobs(
      mockedRemoteObjects,
      mockedDestPath,
      MOCKED_CLIENT_OPTIONS,
      MOCKED_DOWNLOAD_OPTIONS
    );

    const downloadJobInstanceOptions = MockedDownloadJob.mock.calls.map(([options]) => options);
    const expectFiles: ExpectFile[] = [
      {
        to: {
          name: "abc",
          path: `${path.sep}${path.join("local-dir", "abc")}`,
        },
        from: {
          key: "remote-dir/abc",
        },
      },
      {
        to: {
          name: "foo1",
          path: `${path.sep}${path.join("local-dir", "bar", "foo1")}`,
        },
        from: {
          key: "remote-dir/bar/foo1",
        },
      },
      {
        to: {
          name: "foo2",
          path: `${path.sep}${path.join("local-dir", "bar", "foo2")}`,
        },
        from: {
          key: "remote-dir/bar/foo2",
        },
      },
    ];
    checkFiles(
      downloadJobInstanceOptions
        .map(o => ({
          from: o.from,
          to: o.to,
        })),
      expectFiles,
      MOCKED_BUCKET,
    );
  });

  it("test createDownloadJobs from remote empty name dir to local root", async () => {
    mockListObjects({
      [MOCKED_EMPTY_NAME_DIR]: {
        "abc": "some data",
        "bar": {
          "foo1": "some data1",
          "foo2": "some data2",
        },
      },
      "alpha": {
        [MOCKED_EMPTY_NAME_DIR]: {
          "xyz": "some xyz",
        },
      },
    });

    const mockedRemoteObjects = [
      "/abc",
      "/bar/",
      "alpha//"
    ].map(p => createMockRemoteObject({
      bucket: MOCKED_BUCKET,
      key: p,
    }));
    const mockedDestPath: string = `${path.sep}local-dir`;
    const downloadManager = new DownloadManager(DEFAULT_UPLOAD_MANAGER_CONFIG);
    await downloadManager.createDownloadJobs(
      mockedRemoteObjects,
      mockedDestPath,
      MOCKED_CLIENT_OPTIONS,
      MOCKED_DOWNLOAD_OPTIONS
    );

    const downloadJobInstanceOptions = MockedDownloadJob.mock.calls.map(([options]) => options);
    const expectFiles: ExpectFile[] = [
      {
        from: {
          key: "/abc",
        },
        to: {
          name: "abc",
          path: `${path.sep}${path.join("local-dir", "abc")}`,
        },
      },
      {
        from: {
          key: "/bar/foo1",
        },
        to: {
          name: "foo1",
          path: `${path.sep}${path.join("local-dir", "bar", "foo1")}`,
        },
      },
      {
        from: {
          key: "/bar/foo2",
        },
        to: {
          name: "foo2",
          path: `${path.sep}${path.join("local-dir", "bar", "foo2")}`,
        },
      },
      {
        from: {
          key: "alpha//xyz",
        },
        to: {
          name: "xyz",
          path: `${path.sep}${path.join("local-dir", "alpha", "xyz")}`,
        },
      },
    ];
    checkFiles(
      downloadJobInstanceOptions
        .map(o => ({
          from: o.from,
          to: o.to,
        })),
      expectFiles,
      MOCKED_BUCKET,
    );
  });
});
