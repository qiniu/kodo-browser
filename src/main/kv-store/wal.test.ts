import path from "path"
import fsPromises from "fs/promises";
import os from "os";

import WAL from "./wal";

interface TestData {
  id: string,
  name: string,
  progress: {
    number: number,
    etag: string,
  }[],
}

describe("test wal.ts", () => {
  const BASE_DIR = "kb-data-store-";

  const dirsToCleanup: string[] = [];
  const wals: WAL<any>[] = [];

  async function getWal(filename: string) {
    const dirPath = await fsPromises.mkdtemp(path.join(os.tmpdir(), BASE_DIR));
    dirsToCleanup.push(dirPath);
    return new WAL<TestData>({
      filePath: path.join(dirPath, filename)
    });
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
      wals.map(wal => wal.close())
    );
    expect(closeResult.filter(r => r.status === "rejected")).toEqual([]);
  });

  it("set", async () => {
    const wal = await getWal("a.jsonl")
    const d: TestData = {
      id: "123",
      name: "test123",
      progress: [
        {
          number: 1,
          etag: "mocked1",
        },
      ],
    };
    await wal.set("123", d)
    const c = await fsPromises.readFile(wal.filePath)
    expect(c.toString())
      .toEqual(JSON.stringify({type: "c", key: "123", data: d}) + "\n")
  });

  it("delete", async () => {
    const wal = await getWal("d.jsonl");
    await wal.del("123");
    const c = await fsPromises.readFile(wal.filePath);
    expect(c.toString())
      .toEqual(JSON.stringify({
        type: "d",
        key: "123",
      }) + "\n");
  });

  it("read all", async () => {
    const wal = await getWal("f.jsonl")

    const d1: TestData = {
      id: "123",
      name: "test123",
      progress: [
        {
          number: 1,
          etag: "mocked1",
        },
      ],
    };
    await wal.set("123", d1)
    const d1Process: TestData["progress"] = [
      {
        number: 1,
        etag: "mocked1"
      },
      {
        number: 2,
        etag: "mocked2"
      }
    ];
    await wal.set("123", {
      ...d1,
      progress: d1Process,
    })
    const d2: TestData = {
      id: "1234",
      name: "test1234",
      progress: [],
    };
    await wal.set("1234", d2)
    const d3: TestData = {
      id: "12345",
      name: "test12345",
      progress: [],
    };
    await wal.set("12345", d3)
    await wal.del("1234")

    expect(await wal.getAll())
      .toEqual({
        "123": {
          ...d1,
          progress: d1Process,
        },
        "1234": null,
        "12345": d3,
      })
  });
});
