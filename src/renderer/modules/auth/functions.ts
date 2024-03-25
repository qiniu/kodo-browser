import lodash from "lodash";

import * as LocalLogger from "@renderer/modules/local-logger";
import * as QiniuClient from "@renderer/modules/qiniu-client";

import {AkItem, EndpointType} from "./types";
import {authPersistence} from "./persistence";

let currentUser: AkItem | null = null;
let history: AkItem[] = [];

export async function loadPersistence() {
  [currentUser, history] = await Promise.all([
    authPersistence.read(),
    authPersistence.readHistory(),
  ]);
  if (!Array.isArray(history)) {
    history = [];
  }
  LocalLogger.debug("load ak history", currentUser, history);
}

export async function signIn(akItem: AkItem, remember: boolean) {
  try {
    await QiniuClient.listAllBuckets({
      id: akItem.accessKey,
      secret: akItem.accessSecret,
      isPublicCloud: akItem.endpointType === EndpointType.Public,
    });
  } catch (err) {
    QiniuClient.clearAllCache();
    throw err;
  }
  currentUser = akItem;
  if (remember) {
    await authPersistence.save(akItem);
    const foundIndex = history.findIndex(
      ak =>
        ak.accessKey === akItem.accessKey &&
        ak.accessSecret === akItem.accessSecret
    );
    if (foundIndex < 0) {
      history.push(akItem);
    } else {
      history[foundIndex] = akItem;
    }
    await authPersistence.saveHistory(history);
  }
}

export async function signOut() {
  currentUser = null;
  await authPersistence.clear();
}

export function getCurrentUser(): AkItem | null {
  return currentUser;
}

export function getHistory(): AkItem[] {
  return history;
}

export async function deleteHistory(target: AkItem) {
  lodash.remove(
    history,
    akItem =>
      akItem.accessKey === target.accessKey &&
      akItem.accessSecret === target.accessSecret
  );
  await authPersistence.saveHistory(history);
}

export async function clearHistory() {
  history = [];
  await authPersistence.clearHistory();
}
