import {DataStore, getDataStoreOrCreate} from "./data-store";
import path from "path";
import fsPromises from "fs/promises";
import os from "os";

interface TestData {
  id: string,
  name: string,
  progress: {
    number: number,
    etag: string,
  }[],
}

describe("test data-store.ts", () => {
  const BASE_DIR = "kb-data-store-";
  const dirsToCleanup: string[] = [];
  const dataStoresToClose: DataStore<any>[] = [];

  async function getDataStore() {
    const dirPath = await fsPromises.mkdtemp(path.join(os.tmpdir(), BASE_DIR));
    dirsToCleanup.push(dirPath);
    const dataStore = await getDataStoreOrCreate<TestData>({
      workingDirectory: dirPath,
    });
    dataStoresToClose.push(dataStore);
    return dataStore;
  }

  afterAll(async () => {
    const cleanupResult = await Promise.allSettled(
      dirsToCleanup.map(d => fsPromises.rm(d, {force: true, recursive: true}))
    );
    cleanupResult.forEach(r => {
      if (r.status === "rejected") {
        console.error("cleanup error", r.reason);
      }
    });
    const closeResult = await Promise.allSettled(
      dataStoresToClose.map(store => store.close())
    );
    expect(closeResult.filter(r => r.status === "rejected")).toEqual([]);
  });

  it("test sets and retrieves data correctly", async () => {
    const dataStore = await getDataStore();
    const testData: TestData = {
      id: "123",
      name: "test123",
      progress: [
        {
          number: 1,
          etag: "mocked1",
        },
      ],
    };
    await dataStore.set(testData.id, testData);
    const retrievedData = await dataStore.get(testData.id);
    expect(retrievedData).toEqual(testData);
  });

  it("test deletes data correctly", async () => {
    const dataStore = await getDataStore();
    const testData: TestData = {
      id: "123",
      name: "test123",
      progress: [
        {
          number: 1,
          etag: "mocked1",
        },
      ],
    };
    await dataStore.set(testData.id, testData);
    await dataStore.del(testData.id);
    const retrievedData = await dataStore.get(testData.id);
    expect(retrievedData).toBeUndefined();
  });

  it("test clears all data correctly", async () => {
    const dataStore = await getDataStore();
    const testData1: TestData = {
      id: "123",
      name: "test123",
      progress: [
        {
          number: 1,
          etag: "mocked1",
        },
      ],
    };
    const testData2: TestData = {
      id: "456",
      name: "test456",
      progress: [
        {
          number: 2,
          etag: "mocked2",
        },
      ],
    };
    await dataStore.set(testData1.id, testData1);
    await dataStore.set(testData2.id, testData2);
    await dataStore.clear();
    const retrievedData1 = await dataStore.get(testData1.id);
    const retrievedData2 = await dataStore.get(testData2.id);
    expect(retrievedData1).toBeUndefined();
    expect(retrievedData2).toBeUndefined();
  });

  it("test compacts data correctly", async () => {
    const dataStore = await getDataStore();
    const testData1: TestData = {
      id: "123",
      name: "test123",
      progress: [
        {
          number: 1,
          etag: "mocked1",
        },
      ],
    };
    await dataStore.set(testData1.id, testData1);
    let metaData = JSON.parse((await fsPromises.readFile(dataStore.metaFilePath)).toString())

    let walContent = (await fsPromises.readFile(metaData.memTableWALPath)).toString();
    let diskTableContent = (await fsPromises.readFile(metaData.diskTableFilePath)).toString();
    let expectDiskTableContent = [
      ``,
      `{}`,
      `{"version":"v1","indexOffset":1,"indexLength":3}`,
    ].join("\n");
    expect(walContent).toEqual(JSON.stringify({type: "c", key: testData1.id, data: testData1}) + "\n");
    expect(diskTableContent).toEqual(expectDiskTableContent);

    await dataStore.compact(true);
    await expect(fsPromises.readFile(metaData.memTableWALPath)).rejects.toThrow("ENOENT");
    metaData = JSON.parse((await fsPromises.readFile(dataStore.metaFilePath)).toString())
    walContent = (await fsPromises.readFile(metaData.memTableWALPath)).toString();
    diskTableContent = (await fsPromises.readFile(metaData.diskTableFilePath)).toString();
    expectDiskTableContent = [
      `3:123:${JSON.stringify(testData1)}`,
      ``,
      `{"123":[0,79]}`,
      `{"version":"v1","indexOffset":80,"indexLength":15}`,
    ].join("\n");
    expect(walContent).toEqual("");
    expect(diskTableContent).toEqual(expectDiskTableContent);

    const testData2: TestData = {
      id: "456",
      name: "test456",
      progress: [
        {
          number: 2,
          etag: "mocked2",
        },
      ],
    };
    await dataStore.set(testData2.id, testData2);
    await dataStore.del(testData1.id);
    await dataStore.compact(true);
    await expect(fsPromises.readFile(metaData.memTableWALPath)).rejects.toThrow("ENOENT");
    metaData = JSON.parse((await fsPromises.readFile(dataStore.metaFilePath)).toString())
    walContent = (await fsPromises.readFile(metaData.memTableWALPath)).toString();
    diskTableContent = (await fsPromises.readFile(metaData.diskTableFilePath)).toString();
    expectDiskTableContent = [
      `3:456:${JSON.stringify(testData2)}`,
      ``,
      `{"456":[0,79]}`,
      `{"version":"v1","indexOffset":80,"indexLength":15}`,
    ].join("\n");
    expect(walContent).toEqual("");
    expect(diskTableContent).toEqual(expectDiskTableContent);
  });
});
