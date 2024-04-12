import {useMemo, useSyncExternalStore} from "react";

import {HttpUrl} from "@renderer/const/patterns";
import * as DefaultDict from "@renderer/modules/default-dict";
import {AkItem, EndpointType, ShareSession} from "@renderer/modules/auth";
import {Endpoint} from "@renderer/modules/qiniu-client";
import {LocalFile, serializer} from "@renderer/modules/persistence";

import handleLoadError from "./error-handler";
import UserConfigStore from "./user-config-store";

const DEFAULT_ENDPOINT: Endpoint = {
  ucUrl: "",
  regions: [],
};

const publicEndpointConfig = new UserConfigStore({
  defaultData: DEFAULT_ENDPOINT,
});
let privateEndpointConfig: UserConfigStore<Endpoint>;
export function getEndpointConfig(akItem: AkItem | null) {
  if (akItem && akItem.endpointType === EndpointType.Public) {
    return publicEndpointConfig;
  }
  if (privateEndpointConfig) {
    return privateEndpointConfig;
  }
  const defaultData = DefaultDict.get("PRIVATE_ENDPOINT") ?? DEFAULT_ENDPOINT;
  privateEndpointConfig = new UserConfigStore<Endpoint>({
    defaultData,
    persistence: new LocalFile({
      filePath: `config.json`,
      serializer: new serializer.JSONSerializer(),
    }),
    onLoadError: handleLoadError,
  });
  privateEndpointConfig.watchPersistence();
  return privateEndpointConfig;
}

export function useEndpointConfig(akItem: AkItem | null, shareSession?: ShareSession | null) {
  const endpointConfig = useMemo(
    () => getEndpointConfig(akItem),
    [akItem]
  );

  const {
    state: endpointConfigState,
    data: endpointConfigData,
  } = useSyncExternalStore(
    endpointConfig.store.subscribe,
    endpointConfig.store.getSnapshot,
  );

  const setEndpoint = (endpoint: Endpoint) => {
    if (shareSession) {
      throw new Error("Can't set ShareSession Endpoint")
    }
    return endpointConfig.setAll(endpoint, false);
  };

  const endpointValid = useMemo(
    () => {
      if (shareSession) {
        return true;
      }
      return endpointConfigData.ucUrl && endpointConfigData.ucUrl.match(HttpUrl);
    },
    [endpointConfigData.ucUrl],
  );

  if (shareSession) {
    return {
      endpointConfigState: {
        initialized: true,
        loadingPersistence: false,
        loadError: null,
        changedPersistenceValue: false,
        valid: endpointValid,
      },
      endpointConfigData: {
        ucUrl: "",
        regions: [{
          identifier: shareSession.regionS3Id,
          label: shareSession.regionS3Id,
          endpoint: shareSession.endpoint,
        }],
      },
      endpointConfigLoadPersistencePromise: Promise.resolve(),
      setEndpoint,
    }
  }

  return {
    endpointConfigState: {
      ...endpointConfigState,
      valid: endpointValid,
    },
    endpointConfigData,
    endpointConfigLoadPersistencePromise: endpointConfig.loadPersistencePromise,
    setEndpoint,
  };
}
