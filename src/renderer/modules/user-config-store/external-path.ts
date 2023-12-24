import path from "path";

import {KodoAddress} from "@renderer/modules/kodo-address";

import UserConfigStore from "./user-config-store";
import {AkItem} from "@renderer/modules/auth";
import {LocalFile, serializer} from "@renderer/modules/persistence";
import {useMemo, useSyncExternalStore} from "react";

export interface ExternalPathItem extends KodoAddress {
  regionId: string,
}

export function isExternalPathItem(address: KodoAddress): address is ExternalPathItem {
  return "regionId" in address;
}

export interface ExternalPathData {
  list: ExternalPathItem[],
}

const DEFAULT_EXTERNAL_PATH_DATA: ExternalPathData = {
  list: [],
};

// the cache is small. so no clean for now. use Map<string, WeakRef<>> if needed.
const cacheMap = new Map<string, UserConfigStore<ExternalPathData>>();

function getExternalPath(akItem: AkItem | null) {
  if (!akItem) {
    return new UserConfigStore<ExternalPathData>({
      defaultData: DEFAULT_EXTERNAL_PATH_DATA,
    });
  }
  let result = cacheMap.get(akItem.accessKey);
  if (result) {
    return result;
  }
  result = new UserConfigStore<ExternalPathData>({
    defaultData: DEFAULT_EXTERNAL_PATH_DATA,
    persistence: new LocalFile({
      filePath: path.join(`profile_${akItem.accessKey}`, "bookmarks.json"),
      serializer: new serializer.JSONSerializer(),
    }),
  });
  cacheMap.set(akItem.accessKey, result);
  return result;
}

export default function useExternalPath(akItem: AkItem | null) {
  // change to `use(resource)` API and `<Suspense>` after `use` is stable.
  const externalPath = useMemo(
    () => getExternalPath(akItem),
    [akItem],
  );

  const {
    state: externalPathState,
    data: externalPathData,
  } = useSyncExternalStore(
    externalPath.store.subscribe,
    externalPath.store.getSnapshot,
  );

  const hasExternalPath = (target: ExternalPathItem): boolean => {
    if (!target.path.endsWith("/")) {
      target.path += "/";
    }
    return externalPathData.list.some(p =>
      p.protocol === target.protocol &&
      p.regionId === target.regionId &&
      p.path === target.path
    );
  };

  const addExternalPath = (target: ExternalPathItem): Promise<void> => {
    return externalPath.set("list", [
      ...externalPathData.list,
      target,
    ]);
  };

  const deleteExternalPath = (target: ExternalPathItem): Promise<void> => {
    if (!target.path.endsWith("/")) {
      target.path += "/";
    }
    return externalPath.set("list", externalPathData.list.filter(p =>
      p.protocol === target.protocol &&
      p.regionId === target.regionId &&
      p.path === target.path
    ));
  };

  return {
    externalPathState,
    externalPathData,
    hasExternalPath,
    addExternalPath,
    deleteExternalPath,
    loadFromPersistence: externalPath.loadFromPersistence,
  };
}
