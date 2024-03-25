import fs from "fs";
import fsPromises, {FileHandle} from "fs/promises";
import readline from "readline";

enum DiskTableVersion {
  V1 = "v1",
}

const DISK_TABLE_LAST_VERSIONS = DiskTableVersion.V1

interface DiskTableMeta {
  version: DiskTableVersion,
  indexOffset: number,
  indexLength: number,
}

// Record<key, [offset, length]>
type DiskTableIndexMap = Map<string, [number, number]>;

interface DiskTableOptions {
  filePath: string,
}


export class DiskTable<T> {
  readonly filePath: string

  private _readingFH: FileHandle | Promise<FileHandle>
  private meta: DiskTableMeta | null
  private indexMap: DiskTableIndexMap

  constructor({
    filePath,
  }: DiskTableOptions) {
    this.filePath = filePath;
    this._readingFH = fsPromises.open(this.filePath, "r");
    this.meta = null;
    this.indexMap = new Map();
  }

  get version(): string | undefined {
    return this.meta?.version;
  }

  async init({
    meta,
    idxMap,
  }: {
    meta?: DiskTableMeta,
    idxMap?: Map<string, [number, number]>,
  } = {}) {
    if (!meta || !idxMap) {
      await this.initFromFile();
      return;
    }
    this.meta = meta;
    this.indexMap = idxMap;
    this._readingFH = await this.getReadingFH();
  }

  async close() {
    const fh = await this.getReadingFH();
    await fh.close();
  }

  async has(key: string): Promise<boolean> {
    return this.indexMap.has(key);
  }

  async get(key: string): Promise<T | undefined> {
    const readingFH = await this.getReadingFH();
    const [offset, length] = this.indexMap.get(key) ?? [];
    if (offset === undefined || length === undefined) {
      return;
    }
    const d = Buffer.alloc(length);
    // change to read({...}) after removing v14 in engine of package.json
    await readingFH.read(
      d,
      0,
      length,
      offset,
    );
    const [, v] = parse<T>(d.toString());
    return v ? v : undefined;
  }

  get size(): number {
    return this.indexMap.size;
  }

  async* iter({
    ignoreParseError = false,
  } = {}): AsyncGenerator<[string, T | null], void> {
    let rl: readline.Interface | undefined;
    try {
      rl = readline.createInterface({
        input: fs.createReadStream(this.filePath, {flags: 'r'})
      });
      for await (const l of rl) {
        if (!l) {
          break;
        }
        try {
          yield parse<T>(l);
        } catch (err) {
          if (!ignoreParseError) {
            throw err;
          }
        }
      }
    } finally {
      rl?.close();
    }
  }

  private async getReadingFH(): Promise<FileHandle> {
    if (this._readingFH instanceof Promise) {
      return await this._readingFH;
    }
    return this._readingFH;
  }

  private async initFromFile() {
    const fh = await fsPromises.open(this.filePath, "r");

    try {
      this.meta = await this.readMeta(fh);
      this.indexMap = await this.readIndexMap(fh, this.meta);
      this._readingFH = await this.getReadingFH();
    } finally {
      await fh.close();
    }
  }

  private async readMeta(fh: FileHandle): Promise<DiskTableMeta> {
    let lenFromEnd = 0;
    let currentChar = Buffer.alloc(1);
    const fSize = (await fh.stat()).size;
    while (currentChar.toString() !== "\n") {
      lenFromEnd += 1;
      // change to read({...}) after removing v14 in engine of package.json
      await fh.read(
        currentChar,
        0,
        1,
        fSize - lenFromEnd,
      );
    }
    const metaOffset = fSize - lenFromEnd;
    const metaBuf = Buffer.alloc(lenFromEnd);
    // change to read({...}) after removing v14 in engine of package.json
    await fh.read(
      metaBuf,
      0,
      lenFromEnd,
      metaOffset,
    );
    return JSON.parse(metaBuf.toString());
  }

  private async readIndexMap(fh: FileHandle, meta: DiskTableMeta): Promise<Map<string, [number, number]>> {
    const idxMapBuf = Buffer.alloc(meta.indexLength);
    // change to read({...}) after removing v14 in engine of package.json
    await fh.read(
      idxMapBuf,
      0,
      meta.indexLength,
      meta.indexOffset,
    );
    return new Map<string, [number, number]>(
      Object.entries(JSON.parse(idxMapBuf.toString()))
    );
  }

}

type ParseResult<T> = [string, T | null];

function parse<T>(data: string): ParseResult<T> {
  const keyLenEnd = data.indexOf(":");
  const keyLen = parseInt(data.slice(0, keyLenEnd));
  // the `+ 1` is there is 1 `:` between keyLen and key
  const keyStart = keyLenEnd + 1;
  const key = data.slice(keyStart, keyStart + keyLen);
  // the `+ 2` is there are 2 `:` before value
  const value = JSON.parse(
    data.slice(keyLenEnd + keyLen + 2)
  );
  return [
    key,
    value,
  ];
}

function stringify<T>(key: string, value: T): string {
  return key.length + ":" + key + ":" + JSON.stringify(value);
}

interface CreateDiskTableOptions<T> {
  filePath: string,
  values: AsyncIterable<[string, T | null]> | Iterable<[string, T | null]>, // must be sorted

  tmpFilePath?: string,
  version?: DiskTableVersion,
  checkExist?: boolean,
  // if there has multiple level disk-table, such as lv0~lv7,
  // this should be true only with creating lv7.
  skipNullValue?: boolean,
}

export async function createDiskTable<T>({
  filePath,
  values,
  tmpFilePath = `${filePath}.creating`,
  version = DISK_TABLE_LAST_VERSIONS,
  checkExist = false,
  skipNullValue = false,
}: CreateDiskTableOptions<T>): Promise<DiskTable<T>> {
  // initial
  let fh: FileHandle | undefined;
  const flags = checkExist ? "wx" : "w";

  const idxObj: Record<string, [number, number]> = {};
  let meta: DiskTableMeta;

  try {
    // open file
    fh = await fsPromises.open(tmpFilePath, flags);
    let offset = 0;

    // write data
    for await (const [key, data] of values) {
      if (!data && skipNullValue) {
        continue;
      }
      const d = stringify(key, data) + "\n";
      const {bytesWritten} = await fh.write(d);
      idxObj[key] = [offset, bytesWritten];
      offset += bytesWritten;
    }

    // write an empty line for the data end
    let {bytesWritten} = await fh.write("\n");
    offset += bytesWritten;

    // write index map
    const indexOffset = offset;
    const idx = JSON.stringify(idxObj) + "\n";
    const {bytesWritten: indexLength} = await fh.write(idx);

    // write meta
    meta = {
      version,
      indexOffset,
      indexLength,
    };
    await fh.write(JSON.stringify(meta));
  } finally {
    await fh?.close();
  }

  await fsPromises.rename(tmpFilePath, filePath);

  // create instance
  const result = new DiskTable<T>({
    filePath,
  });
  await result.init({
    meta,
    idxMap: new Map(Object.entries(idxObj)),
  });
  return result;
}
