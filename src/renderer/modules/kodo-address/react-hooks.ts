import {useEffect, useRef, useState, useSyncExternalStore} from "react";

import {AkItem} from "@renderer/modules/auth";

import {KodoAddress} from "./types";
import {Bookmark, DEFAULT_HOME_ADDRESS, KodoBookmark} from "./bookmark";
import {ExternalPathItem, KodoExternalPath} from "./external-path";

const bookmarkStore = {
  data: {
    homeAddress: DEFAULT_HOME_ADDRESS,
    list: []
  } as Bookmark,
  listeners: new Set<() => void>(),
  subscribe(l: () => void) {
    bookmarkStore.listeners.add(l);
    return () => bookmarkStore.listeners.delete(l);
  },
  getSnapshot() {
    return bookmarkStore.data;
  },
  dispatch(data: Bookmark) {
    bookmarkStore.data = {
      ...bookmarkStore.data,
      ...data,
    };
    bookmarkStore.listeners.forEach(l => l());
  },
};

export function useKodoBookmark(currentUser: AkItem | null) {
  const kodoBookmarkRef = useRef<KodoBookmark | null>(null);

  const bookmarkState = useSyncExternalStore(
    bookmarkStore.subscribe,
    bookmarkStore.getSnapshot,
  );

  useEffect(() => {
    if (!currentUser) {
      bookmarkStore.dispatch({
        homeAddress: DEFAULT_HOME_ADDRESS,
        list: [],
      });
      return;
    }
    kodoBookmarkRef.current = new KodoBookmark({
      persistPath: KodoBookmark.getPersistPath(currentUser.accessKey),
    });
    bookmarkStore.dispatch(
      kodoBookmarkRef.current.read()
    );
  }, [currentUser]);

  const addBookmark = (target: KodoAddress) => {
    if (!kodoBookmarkRef.current) {
      return;
    }
    kodoBookmarkRef.current.addBookmark(target);
    bookmarkStore.dispatch(
      kodoBookmarkRef.current.read()
    );
  };

  const deleteBookmark = (target: KodoAddress) => {
    if (!kodoBookmarkRef.current) {
      return;
    }
    kodoBookmarkRef.current.deleteBookmark(target);
    bookmarkStore.dispatch(
      kodoBookmarkRef.current.read()
    );
  };

  const setHome = (target: KodoAddress) => {
    if (!kodoBookmarkRef.current) {
      return;
    }
    kodoBookmarkRef.current.setHome(target);
    bookmarkStore.dispatch(
      kodoBookmarkRef.current.read()
    );
  };

  return {
    bookmarkState,
    addBookmark,
    deleteBookmark,
    setHome,
  };
}

export function useKodoExternalPath(currentUser: AkItem | null) {
  const [kodoExternalPath, setKodoExternalPath] = useState<KodoExternalPath>();
  const [externalPaths, setExternalPaths] = useState<ExternalPathItem[]>([]);
  useEffect(() => {
    if (!currentUser) {
      return;
    }
    const kodoExternalPath = new KodoExternalPath({
      persistPath: KodoExternalPath.getPersistPath(currentUser.accessKey),
    });
    setExternalPaths(kodoExternalPath.read().list);
    setKodoExternalPath(kodoExternalPath);
  }, [currentUser]);

  return {
    externalPathState: {
      kodoExternalPath,
      externalPaths,
    },
    setExternalPaths,
  };
}
