import path from "path";

import {useMemo, useSyncExternalStore} from "react";

import {ADDR_KODO_PROTOCOL} from "@renderer/const/kodo-nav";
import {AkItem} from "@renderer/modules/auth";
import {LocalFile, serializer} from "@renderer/modules/persistence";
import {KodoAddress} from "@renderer/modules/kodo-address";

import UserConfigStore from "./user-config-store";

export interface BookmarkItem extends KodoAddress {
  timestamp: number, // ms
}

export interface BookmarkPathData {
  homeAddress: KodoAddress,
  list: BookmarkItem[],
}

const DEFAULT_BOOKMARK_PATH_DATA: BookmarkPathData = {
  homeAddress: {
    protocol: ADDR_KODO_PROTOCOL,
    path: "",
  },
  list: [],
};

// the cache is small. so no clean for now. use Map<string, WeakRef<>> if needed.
const cacheMap = new Map<string, UserConfigStore<BookmarkPathData>>();

function getBookmarkPath(akItem: AkItem | null) {
  if (!akItem) {
    return new UserConfigStore<BookmarkPathData>({
      defaultData: DEFAULT_BOOKMARK_PATH_DATA,
    });
  }
  let result = cacheMap.get(akItem.accessKey);
  if (result) {
    return result;
  }
  result = new UserConfigStore<BookmarkPathData>({
    defaultData: DEFAULT_BOOKMARK_PATH_DATA,
    persistence: new LocalFile({
      filePath: path.join(`profile_${akItem.accessKey}`, "bookmarks.json"),
      serializer: new serializer.JSONSerializer(),
    }),
  });
  cacheMap.set(akItem.accessKey, result);
  return result;
}

export default function useBookmarkPath(akItem: AkItem | null) {
  const bookmarkPath = useMemo(
    () => getBookmarkPath(akItem),
    [akItem],
  );

  const {
    state: bookmarkPathState,
    data: bookmarkPathData,
  } = useSyncExternalStore(
    bookmarkPath.store.subscribe,
    bookmarkPath.store.getSnapshot,
  );

  const addBookmark = (target: KodoAddress) => {
    return bookmarkPath.set("list", [
      ...bookmarkPathData.list,
      {
        ...target,
        timestamp: Date.now(),
      },
    ]);
  };

  const deleteBookmark = (target: KodoAddress) => {
    return bookmarkPath.set("list", bookmarkPathData.list.filter(
      b =>
        b.protocol !== target.protocol &&
        b.path !== target.path
    ));
  };

  const setHome = (target: KodoAddress) => {
    return bookmarkPath.set("homeAddress", target);
  };

  return {
    bookmarkPathState,
    bookmarkPathData,
    addBookmark,
    deleteBookmark,
    setHome,
  };
}
