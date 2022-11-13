import lodash from "lodash";

import * as LocalLogger from "@renderer/modules/local-logger";
import * as QiniuClient from "@renderer/modules/qiniu-client";

import {AkItem, EndpointType} from "./types";
import {authPersistence} from "./persister";

let currentUser: AkItem | null = authPersistence.read();
let history: AkItem[] = authPersistence.readHistory();

LocalLogger.debug("load ak history", currentUser, history);

export async function signIn(akItem: AkItem, remember: boolean) {
  await QiniuClient.listAllBuckets({
    id: akItem.accessKey,
    secret: akItem.accessSecret,
    isPublicCloud: akItem.endpointType === EndpointType.Public,
  });
  currentUser = akItem;
  if (remember) {
    authPersistence.save(akItem);
    if (history.some(
      ak =>
        ak.accessKey === akItem.accessKey &&
        ak.accessSecret === akItem.accessSecret
    )) {
      return;
    }
    history.push(akItem);
    authPersistence.saveHistory(history);
  }
}

export function signOut() {
  currentUser = null;
  authPersistence.clear();
}

export function getCurrentUser(): AkItem | null {
  return currentUser;
}

export function getHistory(): AkItem[] {
  return history;
}

export function deleteHistory(target: AkItem) {
  lodash.remove(
    history,
    akItem =>
      akItem.accessKey === target.accessKey &&
      akItem.accessSecret === target.accessSecret
  );
  authPersistence.saveHistory(history);
}

export function clearHistory() {
  history = [];
  authPersistence.clearHistory();
}
