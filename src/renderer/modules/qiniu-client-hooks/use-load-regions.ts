import {useEffect, useState} from "react";
import {Region} from "kodo-s3-adapter-sdk";
import {toast} from "react-hot-toast";

import * as LocalLogger from "@renderer/modules/local-logger";
import {AkItem, EndpointType} from "@renderer/modules/auth";
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
  async function loadRegions() {
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
    const regions = await getRegions(opt);

    setLoadRegionsState({
      loading: false,
      regions,
    });
  }

  const [loadRegionsState, setLoadRegionsState] = useState<LoadRegionsState>({
    loading: true,
    regions: [],
  });

  useEffect(() => {
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
  }, [user]);

  return {
    loadRegionsState,
    loadRegions,
  };
}
