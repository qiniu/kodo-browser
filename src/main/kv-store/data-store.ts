/*
* remember backup this for migrator when make breaking changes.
* */
import {constants as fsConstants} from "fs";
import fsPromises from "fs/promises";
import path from "path";

import {withLockFile} from "@main/lockfile";

import {MemTable, MemTableReadonly} from "./mem-table";
import {createDiskTable, DiskTable} from "./disk-table";

const DB_META_FILE = "db-meta.json";

interface DataStoreOptions<T> {
  workingDirectory: string,
  thresholdDuration: number, // ms
  thresholdSize: number,
  thresholdChangesSize: number,

  memTable: MemTable<T>,
  memTableReadOnly: MemTableReadonly<T> | null,
  diskTable: DiskTable<T>,
}

interface IterAndRes<T> {
  iter: AsyncGenerator<[string, T | null], void> | Generator<[string, T | null], void> | undefined,
  res: IteratorResult<[string, T | null], void>,
}

export class DataStore<T> {
  readonly workingDirectory: string;
  private memTable: MemTable<T>;
  private memTableReadonly: MemTableReadonly<T> | null;
  private diskTable: DiskTable<T>;

  private memTableChangesSize: number;

  private thresholdDuration: number;
  private thresholdSize: number;
  private thresholdChangesSize: number;
  private timestampFromLastCompact: number // ms

  private compactPromise: Promise<boolean> | null

  constructor({
    workingDirectory,
    thresholdDuration,
    thresholdSize,
    thresholdChangesSize,

    memTable,
    memTableReadOnly,
    diskTable,
  }: DataStoreOptions<T>) {
    this.workingDirectory = workingDirectory;
    this.memTable = memTable;
    this.memTableReadonly = memTableReadOnly;
    this.diskTable = diskTable;

    this.memTableChangesSize = 0;

    this.thresholdDuration = thresholdDuration;
    this.thresholdSize = thresholdSize;
    this.thresholdChangesSize = thresholdChangesSize;
    this.timestampFromLastCompact = Date.now();

    this.compactPromise = null;
  }

  async init() {
    // cleanup working directory
    const frameMeta = await getFrameMeta(
      this.metaFilePath
    );
    const keepFiles = [
      this.metaFilePath,
      frameMeta?.memTableWALPath,
      frameMeta?.memTableReadonlyWALPath,
      frameMeta?.diskTableFilePath,
    ].filter(f => f);
    const files = (await fsPromises.readdir(this.workingDirectory))
      .map(name => path.join(this.workingDirectory, name));
    const unlinkPromises = files.filter(f => !keepFiles.includes(f))
      .map(f => fsPromises.unlink(f));
    const unlinkResults = await Promise.allSettled(unlinkPromises);
    unlinkResults.forEach(r => {
      if (r.status === "rejected") {
        console.warn("DataStore cleanup failed", r.reason);
      }
    });

    // initial data
    await Promise.all([
      this.memTable.init(),
      this.memTableReadonly?.init(),
      this.diskTable.init(),
    ]);
    this.memTableChangesSize = this.memTable.size;
    if (this.memTableReadonly?.size) {
      this.compactPromise = this.compact();
    }
  }

  async close() {
    await Promise.all([
      this.memTable.close(),
      this.memTableReadonly?.close(),
      this.diskTable.close(),
    ]);
  }

  async get(key: string): Promise<T | undefined> {
    for (const table of [
      this.memTable,
      this.memTableReadonly,
      this.diskTable,
    ]) {
      const result = await table?.get(key);
      if (await table?.has(key)) {
        return result;
      }
    }
    return;
  }

  async set(key: string, data: T): Promise<void> {
    await this.memTable.set(key, data as T);
    this.memTableChangesSize += 1;
    this.compact();
  }

  async del(key: string): Promise<void> {
    await this.memTable.del(key);
    this.memTableChangesSize += 1;
    this.compact();
  }

  async clear(): Promise<void> {
    if (this.compactPromise) {
      await this.compactPromise;
    }
    const oldMeta = this.meta;
    const tables = await initDataStore<T>(this.workingDirectory);
    this.memTable = tables.memTable;
    this.memTableReadonly = tables.memTableReadonly;
    this.diskTable = tables.diskTable;
    await Promise.all([
      fsPromises.unlink(oldMeta.memTableWALPath),
      oldMeta.memTableReadonlyWALPath && fsPromises.unlink(oldMeta.memTableReadonlyWALPath),
      fsPromises.unlink(oldMeta.diskTableFilePath),
    ]);
  }

  get metaFilePath(): string {
    return path.join(this.workingDirectory, DB_META_FILE);
  }

  get meta(): FrameMetaData {
    return {
      memTableWALPath: this.memTable.wal.filePath,
      memTableReadonlyWALPath: this.memTableReadonly?.wal.filePath,
      diskTableFilePath: this.diskTable.filePath,
    };
  }

  async* iter(): AsyncGenerator<[string, T | null], void> {
    const memIter = this.memTable.iter();
    const memReadonlyIter = this.memTableReadonly?.iter();
    const diskIter = this.diskTable.iter();

    let memIterResult = memIter.next();
    let memReadonlyIterResult = memReadonlyIter?.next() ?? {value: undefined, done: true};
    let diskIterResult = await diskIter.next();

    const listOfIterAndRes: IterAndRes<T>[] = [
      {iter: undefined, res: {value: undefined, done: true}},
      {iter: memIter, res: memIterResult},
      {iter: memReadonlyIter, res: memReadonlyIterResult},
      {iter: diskIter, res: diskIterResult},
    ];

    while (true) {
      // `await listOfIterAndRes.reduce(async () => {})` doesn't work as expecting
      // maybe some bugs on node v16, because same code is working great on v18.18
      let [lastIterAndRes] = listOfIterAndRes;
      for (let i = 1; i < listOfIterAndRes.length; i += 1) {
        const curr = listOfIterAndRes[i];
        if (lastIterAndRes.res.done) {
          lastIterAndRes = curr;
          continue;
        }
        if (curr.res.done) {
          continue;
        }
        const {value: [lastK]} = lastIterAndRes.res;
        const {value: [currK]} = curr.res;
        if (lastK === currK) {
          curr.res = await curr.iter?.next() ?? listOfIterAndRes[0].res;
          continue;
        }
        if (lastK > currK) {
          lastIterAndRes = curr;
        }
      }

      if (lastIterAndRes.res.done) {
        break;
      }

      const [id, data] = lastIterAndRes.res.value;
      // only returns the data not deleted
      if (data) {
        yield [id, data];
      }
      lastIterAndRes.res = await lastIterAndRes.iter?.next() ?? listOfIterAndRes[0].res;
    }
  }

  shouldCompact() {
    return this.memTableChangesSize >= this.thresholdChangesSize ||
      this.memTable.size >= this.thresholdSize ||
      Date.now() - this.timestampFromLastCompact >= this.thresholdDuration;
  }

  compact(force = false): Promise<boolean> {
    if (this.compactPromise) {
      return this.compactPromise;
    }
    if (!force && !this.shouldCompact()) {
      return Promise.resolve(false);
    }
    this.compactPromise = this._compact()
      .then(() => {
        return true
      })
      .finally(() => {
        this.compactPromise = null
      });
    return this.compactPromise;
  }

  private async _compact() {
    // create new readonly memory table
    if (!this.memTableReadonly?.size) {
      const mt = this.memTable;
      this.memTable = new MemTable<T>({
        wal: path.join(this.workingDirectory, `wal-${Date.now()}.jsonl`),
      });
      this.memTableReadonly = new MemTableReadonly<T>({
        wal: mt.wal,
        nodes: mt.nodes,
      });
      await setFrameMeta(
        this.metaFilePath,
        {
          memTableWALPath: this.memTable.wal.filePath,
          memTableReadonlyWALPath: this.memTableReadonly.wal.filePath,
          diskTableFilePath: this.diskTable.filePath,
        },
      );
    }

    // create new disk table
    const diskTableOld = this.diskTable;
    this.diskTable = await createDiskTable({
      filePath: path.join(this.workingDirectory, `disk-table-${Date.now()}.jsonl`),
      values: this.mergeIter(this.memTableReadonly.iter(), diskTableOld.iter()),
      skipNullValue: true,
    });
    await setFrameMeta(
      this.metaFilePath,
      {
        memTableWALPath: this.memTable.wal.filePath,
        diskTableFilePath: this.diskTable.filePath,
      },
    );

    // clean old files
    await diskTableOld.close();
    let walFilePathOld = this.memTableReadonly.wal.filePath;
    await this.memTableReadonly.close();
    this.memTableReadonly = null;
    await Promise.all([
      fsPromises.unlink(diskTableOld.filePath),
      fsPromises.unlink(walFilePathOld),
    ]);

    // reset should compact infos
    this.timestampFromLastCompact = Date.now();
    this.memTableChangesSize = 0;
  }

  private async* mergeIter(
    iNew: AsyncIterableIterator<[string, T | null]> | IterableIterator<[string, T | null]>,
    iOld: AsyncIterableIterator<[string, T | null]> | IterableIterator<[string, T | null]>,
  ): AsyncGenerator<[string, T | null], void> {
    let a = await iNew.next();
    let b = await iOld.next();
    while (!a.done && !b.done) {
      const [ak] = a.value;
      const [bk] = b.value;
      if (ak < bk) {
        yield a.value;
        a = await iNew.next();
      } else if (ak > bk) {
        yield b.value;
        b = await iOld.next();
      } else {
        // ak === bk
        yield a.value;
        a = await iNew.next();
        b = await iOld.next();
      }
    }
    let rest: AsyncIterableIterator<[string, T | null]> | IterableIterator<[string, T | null]> | undefined;
    if (!a.done) {
      yield a.value;
      rest = iNew;
    }
    if (!b.done) {
      yield b.value;
      rest = iOld;
    }
    if (!rest) {
      return;
    }
    // `yield* rest` not work because type not matching
    // https://github.com/Microsoft/TypeScript/issues/2983
    // https://github.com/microsoft/TypeScript/issues/33458
    for await (const i of rest) {
      yield i;
    }
  }
}

// FrameMetaData

interface FrameMetaData {
  memTableWALPath: string,
  memTableReadonlyWALPath?: string,
  diskTableFilePath: string,
}

async function getFrameMeta(filePath: string): Promise<FrameMetaData | undefined> {
  try {
    const metaBuf = await fsPromises.readFile(filePath);
    return JSON.parse(metaBuf.toString());
  } catch {
    return undefined;
  }
}

async function setFrameMeta(filePath: string, d: FrameMetaData) {
  await withLockFile(
    `${filePath}.lock`,
    async () => {
      await fsPromises.writeFile(filePath, JSON.stringify(d))
    },
    {
      retries: 10,
      retryWait: 100,
    },
  );
}

interface CreateDataFrameOptions {
  workingDirectory: string,
  thresholdDuration?: number,
  thresholdSize?: number,
  thresholdLogSize?: number,
}

// try to get DataStore from the working directory, or create it if the directory is empty
export async function getDataStoreOrCreate<T>({
  workingDirectory,
  thresholdDuration = 10000,
  thresholdSize = 1000,
  thresholdLogSize = 10000,
}: CreateDataFrameOptions): Promise<DataStore<T>> {
  const frameMeta = await getFrameMeta(
    path.join(workingDirectory, DB_META_FILE)
  );
  let memTable: MemTable<T>;
  let memTableReadonly: MemTableReadonly<T> | null;
  let diskTable: DiskTable<T>;
  if (frameMeta) {
    memTable = new MemTable<T>({
      wal: frameMeta.memTableWALPath,
    });
    memTableReadonly = frameMeta.memTableReadonlyWALPath
      ? new MemTableReadonly<T>({
        wal: frameMeta.memTableReadonlyWALPath,
      })
      : null;
    let isFileExists: boolean = false;
    if (frameMeta.diskTableFilePath) {
      isFileExists = await fsPromises.access(
        frameMeta.diskTableFilePath,
        fsConstants.F_OK,
      )
        .then(() => true)
        .catch(() => false);
    }
    if (!isFileExists) {
      diskTable = await createDiskTable({
        filePath: frameMeta.diskTableFilePath,
        values: new Set<[string, T]>().values(),
      });
    } else {
      diskTable = new DiskTable<T>({
        filePath: frameMeta.diskTableFilePath,
      });
    }
  } else {
    const tables = await initDataStore<T>(workingDirectory);
    memTable = tables.memTable;
    memTableReadonly = tables.memTableReadonly;
    diskTable = tables.diskTable;
  }

  const result = new DataStore<T>({
    workingDirectory,
    memTable,
    memTableReadOnly: memTableReadonly,
    diskTable,

    thresholdDuration,
    thresholdSize,
    thresholdChangesSize: thresholdLogSize,
  });

  await result.init();

  return result;
}

async function initDataStore<T>(workingDirectory: string) {
  try {
    await fsPromises.access(workingDirectory, fsConstants.F_OK);
  } catch {
    await fsPromises.mkdir(workingDirectory, {recursive: true});
  }
  const memTable = new MemTable<T>({
    wal: path.join(workingDirectory, `wal-${Date.now()}.jsonl`),
  });
  const memTableReadonly = null;
  const diskTable = await createDiskTable({
    filePath: path.join(workingDirectory, `disk-table-${Date.now()}.jsonl`),
    values: new Set<[string, T]>().values(),
  });
  await setFrameMeta(
    path.join(workingDirectory, DB_META_FILE),
    {
      memTableWALPath: memTable.wal.filePath,
      diskTableFilePath: diskTable.filePath,
    },
  );
  return {
    memTable,
    memTableReadonly,
    diskTable,
  };
}
