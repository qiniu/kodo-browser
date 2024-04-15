import path from "path";
import fsPromises from "fs/promises";
import os from "os";

import {DiskTable, createDiskTable} from "./disk-table";

interface TestData {
  id: string,
  name: string,
  progress: {
    number: number,
    etag: string,
  }[],
}

describe("test disk-table.ts", () => {
  const BASE_DIR = "kb-data-store-";

  const dirsToCleanup: string[] = [];
  const diskTableToClose: DiskTable<any>[] = [];

  async function getDiskTable(filename: string, values: Iterable<[string, TestData | null]> = []) {
    const dirPath = await fsPromises.mkdtemp(path.join(os.tmpdir(), BASE_DIR));
    dirsToCleanup.push(dirPath);
    const filePath = path.join(dirPath, filename);
    const diskTable = await createDiskTable<TestData>({
      filePath,
      values,
    });
    diskTableToClose.push(diskTable);
    return diskTable;
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
      diskTableToClose.map(table => table.close())
    );
    expect(closeResult.filter(r => r.status === "rejected")).toEqual([]);
  });

  it("test empty DiskTable", async () => {
    const diskTable = await getDiskTable("a.jsonl");
    expect(diskTable.version).toEqual("v1");
    expect(await diskTable.has("123")).toEqual(false);
    expect(await diskTable.get("123")).toBeUndefined();
    const result = [];
    for await (const item of diskTable.iter()) {
      result.push(item);
    }
    expect(result).toEqual([]);
    expect(diskTable.size).toEqual(0);
  });

  it("test create DiskTable with values", async () => {
    const values: [string, TestData | null][] = [
      [
        "123",
        {
          id: "123",
          name: "test123",
          progress: [
            {
              number: 1,
              etag: "mocked1",
            },
          ],
        },
      ],
      [
        "456",
        null,
      ],
    ];
    const diskTable = await getDiskTable("b.jsonl", values);
    expect(diskTable.version).toEqual("v1");
    expect(await diskTable.has("123")).toEqual(true);
    expect(await diskTable.get("123")).toEqual(values.find(([key]) => key === "123")?.[1]);
    expect(await diskTable.has("456")).toEqual(true);
    expect(await diskTable.get("456")).toBeUndefined();
    const result = [];
    for await (const item of diskTable.iter()) {
      result.push(item);
    }
    expect(result).toEqual(values);
    expect(diskTable.size).toEqual(2);

    const content = await fsPromises.readFile(diskTable.filePath);

    const expectContent = [
      `3:123:{"id":"123","name":"test123","progress":[{"number":1,"etag":"mocked1"}]}`,
      `3:456:null`,
      ``,
      `{"123":[0,79],"456":[79,11]}`,
      `{"version":"v1","indexOffset":91,"indexLength":29}`,
    ].join("\n");

    expect(content.toString()).toEqual(expectContent);
  });
});
