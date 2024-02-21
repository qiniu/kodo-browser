import {watch as fsWatch, constants as fsConstants, promises as fsPromises, FSWatcher} from "fs";
import path from "path";

import lodash from "lodash";

import * as LocalLogger from "@renderer/modules/local-logger";
import {config_path} from "@common/const/app-config";

import Persistence from "./persistence";
import {Serializer} from "./serializer";

interface LocalFileConfig<T> {
  workingDirectory?: string,
  filePath: string,
  serializer: Serializer<T>
}

export default class LocalFile<T> extends Persistence<T> {
  readonly workingDirectory: string;
  readonly filePath: string;
  protected serializer: Serializer<T>;
  private fileWatcher?: FSWatcher;

  constructor({
    workingDirectory = config_path,
    filePath,
    serializer,
  }: LocalFileConfig<T>) {
    super();
    this.workingDirectory = workingDirectory;
    this.filePath = filePath;
    this.serializer = serializer;
    this.handleWatch = lodash.debounce(this.handleWatch, 300).bind(this);
  }

  protected async _load(): Promise<string | null> {
    let canRead = true;
    try {
      await fsPromises.access(this.absoluteFilePath, fsConstants.R_OK);
    } catch (_err) {
      canRead = false;
    }

    if (!canRead) {
      return null;
    }

    return (await fsPromises.readFile(this.absoluteFilePath)).toString();
  }

  protected async _save(value: string): Promise<void> {
    await this.ensureFileBaseDirectory();
    await fsPromises.writeFile(this.absoluteFilePath, value);
  }

  private async ensureFileBaseDirectory(): Promise<void> {
    const fileBasePath = path.dirname(this.absoluteFilePath);

    let exists = true;
    try {
      await fsPromises.access(
        fileBasePath,
        fsConstants.F_OK
      );
    } catch {
      exists = false;
    }

    if (!exists) {
      await fsPromises.mkdir(fileBasePath, {recursive: true});
    }
  }

  // be careful to use this method! double-check the working directory and key is correct.
  async clear(): Promise<void> {
    try {
      await fsPromises.unlink(this.absoluteFilePath);
    } catch (_err) {
      return;
    }
  }

  get absoluteFilePath(): string {
    return path.resolve(this.workingDirectory, this.filePath);
  }

  handleWatch(event: string) {
    this.triggerChange();
    if (event === "rename") {
      // re-watch by rename will lose watching
      this.unwatch();
      this.watch();
    }
  }

  tryWatchBasedir() {
    this.ensureFileBaseDirectory()
      .then(() => {
        const baseDir = path.dirname(this.absoluteFilePath);
        const baseName = path.basename(this.absoluteFilePath);
        this.fileWatcher = fsWatch(
          baseDir,
          {
            persistent: false,
          },
          (event, filename) => {
            if (event === "rename" && filename === baseName) {
              this.triggerChange();
              this.fileWatcher?.close();
              this.watch();
            }
          },
        );
      })
      .catch(err => {
        LocalLogger.error(new Error("LocalFile tryWatchBasedir failed", {cause: err}));
      });
  }

  watch() {
    if (this.fileWatcher) {
      return;
    }
    try {
      this.fileWatcher = fsWatch(
        this.absoluteFilePath,
        {
          persistent: false,
        },
        this.handleWatch,
      );
    } catch (err: any) {
      if (err.code === "ENOENT") {
        this.tryWatchBasedir();
        return;
      }
      LocalLogger.error(new Error("LocalFile watch failed:", {cause: err}));
    }
  }

  unwatch() {
    if (!this.fileWatcher) {
      return;
    }
    this.fileWatcher.close();
    this.fileWatcher = undefined;
  }
}
