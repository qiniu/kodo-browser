import {useEffect, useState} from "react";
import {toast} from "react-hot-toast";
import {Domain} from "kodo-s3-adapter-sdk/dist/adapter";

import {BackendMode} from "@common/qiniu";

import * as LocalLogger from "@renderer/modules/local-logger";
import {AkItem, EndpointType} from "@renderer/modules/auth";
import {listDomains} from "@renderer/modules/qiniu-client";

// for kodo domain and s3 domain
export interface DomainAdapter extends Domain {
  backendMode: BackendMode,
}

export const NON_OWNED_DOMAIN: DomainAdapter = {
  name: "non-owned-domain",
  protocol: "",
  private: true,
  type: "normal",
  backendMode: BackendMode.S3
};

interface LoadDomainsState {
  loading: boolean,
  domains: DomainAdapter[],
}

interface useLoadDomainsProps {
  user: AkItem | null,
  regionId?: string,
  bucketName?: string,
  shouldAutoReload?: () => boolean,
  canS3Domain: boolean
}

export default function useLoadDomains({
  user,
  regionId,
  bucketName,
  shouldAutoReload,
  canS3Domain,
}: useLoadDomainsProps) {
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
    const domains: DomainAdapter[] = (await listDomains(regionId, bucketName, opt))
      .map(d => ({
        ...d,
        backendMode: BackendMode.Kodo,
      }));

    if (canS3Domain) {
      domains.unshift(NON_OWNED_DOMAIN);
    }

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
