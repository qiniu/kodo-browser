import {useEffect, useState} from "react";
import {toast} from "react-hot-toast";
import {Domain} from "kodo-s3-adapter-sdk/dist/adapter";

import * as LocalLogger from "@renderer/modules/local-logger";
import {AkItem, EndpointType} from "@renderer/modules/auth";
import {listDomains} from "@renderer/modules/qiniu-client";

interface LoadDomainsState {
  loading: boolean,
  domains: Domain[],
}

export default function useLoadDomains({
  user,
  regionId,
  bucketName,
  shouldAutoReload,
}: {
  user: AkItem | null,
  regionId?: string,
  bucketName?: string,
  shouldAutoReload?: () => boolean,
}) {
  async function loadDomains() {
    if (!user) {
      return;
    }

    if (!regionId || !bucketName) {
      toast.error("hooks loadDomains lost required arguments.");
      LocalLogger.error(
        "hooks loadDomains lost required arguments,",
        "regionId: ", regionId,
        "bucketName: ", bucketName,
      );
      return;
    }

    setLoadDomainsState(v => ({
      ...v,
      loading: true,
    }));

    const opt = {
      id: user.accessKey,
      secret: user.accessSecret,
      isPublicCloud: user.endpointType === EndpointType.Public,
    };
    const domains = await listDomains(regionId, bucketName, opt);

    setLoadDomainsState({
      loading: false,
      domains,
    });
  }

  const [loadDomainsState, setLoadDomainsState] = useState<LoadDomainsState>({
    loading: true,
    domains: [],
  });

  useEffect(() => {
    if (shouldAutoReload && !shouldAutoReload()) {
      setLoadDomainsState(v => ({
        ...v,
        loading: false,
      }));
      return;
    }
    loadDomains()
      .catch(err => {
        toast.error(err.toString());
        LocalLogger.error(err);
      });
  }, [regionId, bucketName]);

  return {
    loadDomainsState,
    loadDomains,
  };
}
