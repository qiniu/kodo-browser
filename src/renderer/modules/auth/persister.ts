import {browserLocalStorage, localFile} from "@renderer/modules/persistence";

import {AkItem, EndpointType} from "./types";
import {cipher, decipher} from "./cipher";

class AuthPersistence {
  static UserStoreKey = "auth-info";
  static HistoryFile = "ak_histories.json";

  save(value: AkItem) {
    browserLocalStorage.save(
      AuthPersistence.UserStoreKey,
      {
        // Backward Compatibility
        id: value.accessKey,
        secret: value.accessSecret,
        isPublicCloud: value.endpointType === EndpointType.Public,
        description: value.description,
      },
      d => cipher(d),
    );
  }

  read(): AkItem | null {
    const data = browserLocalStorage.read(
      AuthPersistence.UserStoreKey,
      d => d ? decipher(d) : "null",
    );
    if (!data) {
      return null;
    }
    return {
      // Backward Compatibility
      accessKey: data.id,
      accessSecret: data.secret,
      endpointType: data.isPublicCloud
        ? EndpointType.Public
        : EndpointType.Private,
      description: data.description,
    };
  }

  clear() {
    browserLocalStorage.delete(AuthPersistence.UserStoreKey);
  }

  readHistory(): AkItem[] {
    const jsonStrData = localFile
      .read(AuthPersistence.HistoryFile)
      .toString();
    if (!jsonStrData) {
      return [];
    }
    let data = JSON.parse(jsonStrData);
    return data.historyItems
      // Backward Compatibility
      .map((d: {
        accessKeyId: string,
        accessKeySecret: string,
        isPublicCloud: boolean,
        description: string
      }) => ({
        accessKey: d.accessKeyId,
        accessSecret: d.accessKeySecret,
        endpointType: d.isPublicCloud
          ? EndpointType.Public
          : EndpointType.Private,
        description: d.description,
      }));
  }

  saveHistory(histories: AkItem[]) {
    localFile.save(
      AuthPersistence.HistoryFile,
      JSON.stringify({
        // Backward Compatibility
        historyItems: histories.map(d => ({
          accessKeyId: d.accessKey,
          accessKeySecret: d.accessSecret,
          isPublicCloud: d.endpointType === EndpointType.Public,
          description: d.description,
        }))
      }),
    );
  }

  clearHistory() {
    localFile.save(
      AuthPersistence.HistoryFile,
      "{\"historyItems\":[]}",
    );
  }
}

export const authPersistence = new AuthPersistence();
