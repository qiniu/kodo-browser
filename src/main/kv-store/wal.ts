// Write Ahead Logging
import fs from "fs";
import fsPromises, {FileHandle} from "fs/promises";
import readline from "readline";

interface WriteAheadLoggingOptions {
  filePath: string,
}

enum RecordType {
  Create = "c",
  Delete = "d",
}

interface RecordBase {
  key: string,
  type: RecordType,
}

interface RecordCreate<T> extends RecordBase {
  type: RecordType.Create,
  data: T,
}

interface RecordDelete extends RecordBase {
  type: RecordType.Delete,
}

type LogRecord<T> = RecordCreate<T> | RecordDelete;

interface IterOptions {
  ignoreParseError?: boolean,
}

export default class WriteAheadLogging<T> {
  readonly filePath: string
  private _appendingFH: FileHandle | Promise<FileHandle>
  private _changedLogSize: number
  private _baseLogSize: number | null

  constructor({
    filePath,
  }: WriteAheadLoggingOptions) {
    this.filePath = filePath;
    this._changedLogSize = 0;
    this._baseLogSize = null;
    this._appendingFH = fsPromises.open(this.filePath, "a");
    this._appendingFH.then(f => this._appendingFH = f);
  }

  async close(): Promise<void> {
    this._baseLogSize = null;
    this._changedLogSize = 0;
    this._appendingFH = await this._appendingFH;
    await this._appendingFH.close();
  }

  async getLogSize() {
    if (this._baseLogSize !== null) {
      return this._baseLogSize + this._changedLogSize;
    }
    let logSize = 0;
    let rl: readline.Interface | undefined;
    try {
      const rl = readline.createInterface({
        input:  fs.createReadStream(this.filePath),
      });
      for await (const _ of rl) {
        logSize += 1;
      }
    } finally {
      rl?.close();
    }
    this._baseLogSize = logSize;
    return this._baseLogSize + this._changedLogSize;
  }

  private async getAppendingFH() {
    if (this._appendingFH instanceof Promise) {
      return await this._appendingFH;
    }
    return this._appendingFH;
  }

  async set(key: string, data: T) {
    const record: RecordCreate<T> = {
      type: RecordType.Create,
      key,
      data,
    };
    const fh = await this.getAppendingFH();
    await fh.write(JSON.stringify(record) + "\n");
    this._changedLogSize += 1;
  }

  async del(key: string) {
    const record: RecordDelete = {
      type: RecordType.Delete,
      key,
    };
    const fh = await this.getAppendingFH();
    await fh.write(JSON.stringify(record) + "\n");
    this._changedLogSize += 1;
  }

  async getAll(): Promise<Record<string, T | null>> {
    let logSize = 0;
    const result: Record<string, T | null> = {};
    for await (const record of this.iter()) {
      logSize += 1;
      switch (record.type) {
        case RecordType.Create:
          result[record.key] = record.data;
          break;
        case RecordType.Delete:
          result[record.key] = null;
          break;
      }
    }
    this._baseLogSize = logSize;
    return result;
  }

  /**
   * To get the iterable values.
   * Make sure to iterate at least once time for the close called
   */
  async* iter({
    ignoreParseError = false,
  }: IterOptions = {}): AsyncGenerator<LogRecord<T>> {
    let rl: readline.Interface | undefined;
    try {
      rl = readline.createInterface({
        input: fs.createReadStream(this.filePath),
      });
      for await (const l of rl) {
        try {
          const parsedData: LogRecord<T> = JSON.parse(l);
          yield parsedData;
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
}
