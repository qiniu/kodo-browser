import lodash from "lodash";

import * as LocalLogger from "@renderer/modules/local-logger";
import * as QiniuClient from "@renderer/modules/qiniu-client";

import {AkItem, AkSpecialType, EndpointType, ShareSession} from "./types";
import {authPersistence} from "./persistence";

let currentUser: AkItem | null = null;
let shareSession: ShareSession | null = null;
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
      endpointType: akItem.endpointType,
    });
  } catch (err) {
    QiniuClient.clearAllCache();
    throw err;
  }
  akItem.specialType = getAkSpecialType(akItem.accessKey);
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

export interface SignInWithShareLinkOptions {
  apiHosts?: string[],
  shareId: string,
  shareToken: string,
  extractCode: string,
}

export async function signInWithShareLink({
  apiHosts,
  shareId,
  shareToken,
  extractCode,
}: SignInWithShareLinkOptions): Promise<void> {
  const verifyShareOpt: QiniuClient.GetShareServiceOptions = {};
  if (apiHosts?.length) {
    verifyShareOpt.apiUrls = apiHosts;
  }
  const verifyShareResult = await QiniuClient.verifyShare(
    {
      shareId,
      shareToken,
      extractCode,
    },
    verifyShareOpt,
  );
  currentUser = {
    endpointType: EndpointType.ShareSession,
    accessKey: verifyShareResult.federated_ak,
    accessSecret: verifyShareResult.federated_sk,
    specialType: getAkSpecialType(verifyShareResult.federated_ak),
  };
  shareSession = {
    sessionToken: verifyShareResult.session_token,
    endpoint: verifyShareResult.endpoint,
    bucketId: verifyShareResult.bucket_id,
    bucketName: verifyShareResult.bucket_name,
    expires: verifyShareResult.expires,
    permission: verifyShareResult.permission,
    prefix: verifyShareResult.prefix,
    regionS3Id: verifyShareResult.region,
  };
  // do not remember always;
  // await authPersistence.save(currentUser);
}

export interface SignInWithShareSessionOptions {
  akItem: Omit<AkItem, "endpointType">,
  session: ShareSession,
}

export async function signInWithShareSession({
  akItem,
  session,
}: SignInWithShareSessionOptions): Promise<void> {
  if (new Date(session.expires).getTime() < Date.now()) {
    throw new Error("expired session");
  }
  currentUser = {
    ...akItem,
    endpointType: EndpointType.ShareSession,
    specialType: getAkSpecialType(akItem.accessKey),
  };
  shareSession = session;
  // do not remember always;
  // await authPersistence.save(currentUser);
}

export async function signOut() {
  currentUser = null;
  shareSession = null;
  await authPersistence.clear();
}

export function getCurrentUser(): AkItem | null {
  return currentUser;
}

export function getAkSpecialType(accessKey: string = ""): AkSpecialType | undefined {
  if (accessKey.length === 44 && accessKey.startsWith("IAM-")) {
    return AkSpecialType.IAM;
  } else if (accessKey.startsWith("STS-")) {
    return AkSpecialType.STS;
  }
  return;
}

export function getShareSession(): ShareSession | null {
  return shareSession;
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
