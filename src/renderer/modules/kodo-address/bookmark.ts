import lodash from "lodash";

import {ADDR_KODO_PROTOCOL} from "@renderer/const/kodo-nav";
import {localFile} from "@renderer/modules/persistence";

import {KodoAddress} from "./types";

export interface BookmarkItem extends KodoAddress {
  timestamp: number, // ms
}

export interface Bookmark {
  homeAddress: KodoAddress,
  list: BookmarkItem[],
}

export interface KodoBookmarkOptions {
  persistPath: string,
}

export const DEFAULT_HOME_ADDRESS: KodoAddress = {
  protocol: ADDR_KODO_PROTOCOL,
  path: "",
}

export class KodoBookmark {
  static getPersistPath(ak: string) {
    return `bookmarks_${ak}.json`;
  }

  private readonly persistPath: string;

  constructor({persistPath}: KodoBookmarkOptions) {
    this.persistPath = persistPath;
  }

  read(): Bookmark {
    const jsonStrData = localFile
      .read(this.persistPath)
      .toString();
    if (!jsonStrData) {
      return {
        homeAddress: DEFAULT_HOME_ADDRESS,
        list: [],
      };
    }
    let data = JSON.parse(jsonStrData);
    return {
      homeAddress: data.homeAddress,
      // Backward Compatibility
      list: data.bookmarks
        .map((d: {
          fullPath: string,
          mode: string,
          timestamp: number,
        }) => {
          const sep = "://";
          const sepIndex = d.fullPath.indexOf(sep);
          return {
            protocol: d.fullPath.slice(0, sepIndex + sep.length),
            path: d.fullPath.slice(sepIndex + sep.length),
            timestamp: d.timestamp * 1000,
          };
        }),
    };
  }

  save(value: Bookmark) {
    localFile.save(
      this.persistPath,
      JSON.stringify({
        homeAddress: value.homeAddress,
        // Backward Compatibility
        bookmarks: value.list.map(d => ({
          fullPath: d.protocol + d.path,
          timestamp: Math.trunc(d.timestamp / 1000),
        })),
      }),
    );
  }

  setHome(target: KodoAddress) {
    const bookmark = this.read();
    bookmark.homeAddress = target;
    this.save(bookmark);
  }

  addBookmark(target: KodoAddress) {
    const bookmark = this.read();
    bookmark.list.push({
      ...target,
      timestamp: Date.now(),
    });
    this.save(bookmark);
  }

  deleteBookmark(target: KodoAddress) {
    const bookmark = this.read();
    lodash.remove(
      bookmark.list,
      b =>
        b.protocol === target.protocol &&
        b.path === target.path
    );
    this.save(bookmark);
  }
}
