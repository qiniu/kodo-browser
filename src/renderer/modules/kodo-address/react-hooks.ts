import {useEffect, useState} from "react";

import {AkItem} from "@renderer/modules/auth";

import {BookmarkItem, KodoBookmark} from "./bookmark";
import {ExternalPathItem, KodoExternalPath} from "./external-path";

export function useKodoBookmark(currentUser: AkItem | null) {
  const [kodoBookmark, setKodoBookmark] = useState<KodoBookmark>();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  useEffect(() => {
    if (!currentUser) {
      return;
    }
    const kodoBookmark = new KodoBookmark({
      persistPath: KodoBookmark.getPersistPath(currentUser.accessKey),
    });
    setBookmarks(kodoBookmark.read().list);
    setKodoBookmark(kodoBookmark);
  }, [currentUser]);

  return {
    bookmarkState: {
      kodoBookmark,
      bookmarks,
    },
    setBookmarks,
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
