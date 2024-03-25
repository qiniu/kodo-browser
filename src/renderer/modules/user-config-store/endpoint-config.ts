import {useMemo, useSyncExternalStore} from "react";

import {HttpUrl} from "@renderer/const/patterns";
import * as DefaultDict from "@renderer/modules/default-dict";
import {AkItem, EndpointType} from "@renderer/modules/auth";
import {Endpoint} from "@renderer/modules/qiniu-client";
import {LocalFile, serializer} from "@renderer/modules/persistence";

import UserConfigStore from "./user-config-store";
import handleLoadError from "@renderer/modules/user-config-store/error-handler";

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

export function useEndpointConfig(akItem: AkItem | null) {
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
    return endpointConfig.setAll(endpoint, false);
  };

  const endpointValid = useMemo(
    () => endpointConfigData.ucUrl && endpointConfigData.ucUrl.match(HttpUrl),
    [endpointConfigData.ucUrl],
  );

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
