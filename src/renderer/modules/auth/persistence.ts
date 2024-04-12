import {BrowserStorage, LocalFile, serializer} from "@renderer/modules/persistence";

import {AkItem, EndpointType} from "./types";
import {cipher, decipher} from "./cipher";

interface AuthInfo {
  accessKey: string,
  accessSecret: string,
  endpointType: EndpointType,
  description?: string,
}

interface AuthHistory {
  historyItems: AkItem[],
}

class AuthInfoSerializer extends serializer.JSONSerializer<AuthInfo> {
  serialize(value: AuthInfo): string {
    const jsonStr = super.serialize({
      endpointType: value.endpointType,
      accessKey: value.accessKey,
      accessSecret: value.accessSecret,
      description: value.description,
    });
    return cipher(jsonStr);
  }

  deserialize(value: string): AuthInfo {
    const jsonStr = decipher(value);
    const data: any = super.deserialize(jsonStr);

    // compatible with old format
    if (data.hasOwnProperty("isPublicCloud")) {
      return {
        endpointType: data.isPublicCloud
          ? EndpointType.Public
          : EndpointType.Private,
        accessKey: data.id,
        accessSecret: data.secret,
        description: data.description,
      };
    }

    return data;
  }
}

class AuthPersistence {
  static readonly UserStoreKey = "auth-info";
  static readonly HistoryFilePath = "ak_histories.json";

  private authPersistence = new BrowserStorage<AuthInfo>({
    key: AuthPersistence.UserStoreKey,
    serializer: new AuthInfoSerializer(),
  });

  private historyPersistence = new LocalFile<AuthHistory>({
    filePath: AuthPersistence.HistoryFilePath,
    serializer: new serializer.JSONSerializer(),
  });

  async save(value: AkItem) {
    await this.authPersistence.save(value);
  }

  async read() {
    return await this.authPersistence.load();
  }

  async clear() {
    await this.authPersistence.clear();
  }

  async readHistory() {
    const history = await this.historyPersistence.load();
    if (!history) {
      return [];
    }
    return history.historyItems;
  }

  saveHistory(histories: AkItem[]) {
    return this.historyPersistence.save({
      historyItems: histories,
    });
  }

  clearHistory() {
    return this.historyPersistence.clear();
  }
}

export const authPersistence = new AuthPersistence();
