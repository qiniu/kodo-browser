import {useEffect, useState} from "react";
import {Region} from "kodo-s3-adapter-sdk";
import {toast} from "react-hot-toast";

import * as LocalLogger from "@renderer/modules/local-logger";
import {AkItem, EndpointType} from "@renderer/modules/auth";
import {useEndpointConfig} from "@renderer/modules/user-config-store";
import {getRegions} from "@renderer/modules/qiniu-client";

interface LoadRegionsState {
  loading: boolean,
  regions: Region[],
}

export default function useLoadRegions({
  user,
  shouldAutoReload,
}: {
  user: AkItem | null,
  shouldAutoReload?: boolean | (() => boolean),
}) {
  const {
    endpointConfigState,
    endpointConfigData,
    endpointConfigLoadPersistencePromise,
  } = useEndpointConfig(user);

  const [loadRegionsState, setLoadRegionsState] = useState<LoadRegionsState>({
    loading: true,
    regions: [],
  });

  const loadRegions = async () => {
    if (!user) {
      return;
    }

    setLoadRegionsState(v => ({
      ...v,
      loading: true,
    }));

    const opt = {
      id: user.accessKey,
      secret: user.accessSecret,
      isPublicCloud: user.endpointType === EndpointType.Public,
    };

    let regions: Region[] | undefined = undefined;
    try {
      const regionsFromFetch = await getRegions(opt)
      if (user.endpointType === EndpointType.Public) {
        // public
        regions = regionsFromFetch;
      } else {
        // private
        if (!endpointConfigState.initialized) {
          await endpointConfigLoadPersistencePromise
        }
        const regionsFromEndpointConfig = endpointConfigData.regions;
        if (!regionsFromEndpointConfig.length) {
          regions = regionsFromFetch;
        } else {
          try {
            regions = regionsFromEndpointConfig.map(r => {
              const storageClasses = regionsFromFetch
                .find(i => i.s3Id === r.identifier)?.storageClasses ?? []
              const result = new Region(
                r.identifier,
                r.identifier,
                r.label,
                {},
                storageClasses,
              );
              result.s3Urls = [r.endpoint];
              return result
            });
          } catch (e) {
            regions = regionsFromEndpointConfig
              .map(r => {
                const result = new Region(
                  r.identifier,
                  r.identifier,
                  r.label,
                );
                result.s3Urls = [r.endpoint];
                return result
              });
          }
        }
      }
    } finally {
      setLoadRegionsState({
        loading: false,
        regions: regions || [],
      });
    }
  }

  useEffect(() => {
    if (!shouldAutoReload) {
      setLoadRegionsState(v => ({
        ...v,
        loading: false,
      }));
      return;
    }
    if (typeof shouldAutoReload === "boolean" && !shouldAutoReload) {
      setLoadRegionsState(v => ({
        ...v,
        loading: false,
      }));
      return;
    }
    if (typeof shouldAutoReload === "function" && !shouldAutoReload()) {
      setLoadRegionsState(v => ({
        ...v,
        loading: false,
      }));
      return;
    }
    loadRegions()
      .catch(err => {
        toast.error(err.toString());
        LocalLogger.error(err);
      });
  }, [user, shouldAutoReload, endpointConfigState.initialized]);

  return {
    loadRegionsState,
    loadRegions,
  };
}
