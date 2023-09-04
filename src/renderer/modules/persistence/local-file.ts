import path from "path";
import fs from "fs";

import {config_path} from "@common/const/app-config";
import * as LocalLogger from "@renderer/modules/local-logger";

import {Persistence} from "./types";

type AcceptValueType = string | Buffer;

export class LocalFile implements Persistence {
  static getFilePath(cwd: string, key: string) {
    let result = key;
    if (!path.isAbsolute(result)) {
      result = path.resolve(cwd, result);
    }
    return result;
  }

  constructor(private cwd: string = config_path) {
    if (!fs.existsSync(cwd)) {
      fs.mkdirSync(cwd, { recursive: true });
    }
  }

  save<T extends AcceptValueType>(
    key: string,
    value: T,
    encode?: (d: T) => T
  ): void {
    let p = this.getPath(key);

    const folder = path.dirname(p);
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    let v = value;
    if (encode) {
      v = encode(v)
    }

    fs.writeFileSync(p, v);
  }

  readable(key: string): boolean {
    let p = this.getPath(key);

    let canRead = true;
    try {
      fs.accessSync(p, fs.constants.R_OK);
    } catch (_err) {
      canRead = false;
    }

    return canRead;
  }

  read(key: string, decode?: (d: Buffer) => Buffer): Buffer {
    let p = this.getPath(key);

    let result: Buffer = Buffer.alloc(0);
    if (this.readable(key)) {
      result = fs.readFileSync(p);
    }

    if (decode) {
      result = decode(result);
    }
    return result;
  }

  // be careful to use!
  delete(key: string): void {
    let p = this.getPath(key);

    try {
      fs.accessSync(p, fs.constants.R_OK);
    } catch (_err) {
      return
    }

    fs.unlinkSync(p);
  }

  clear(): void {
    LocalLogger.warn("LocalFilePersistence can't clear()!");
  }

  getPath(key: string): string {
    return LocalFile.getFilePath(this.cwd, key);
  }
}

export default new LocalFile();
