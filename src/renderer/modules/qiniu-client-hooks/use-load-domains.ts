import {useEffect, useState} from "react";
import {toast} from "react-hot-toast";
import {Domain} from "kodo-s3-adapter-sdk/dist/adapter";

import Duration from "@common/const/duration";
import {BackendMode} from "@common/qiniu";

import * as customize from "@renderer/customize";
import * as DefaultDict from "@renderer/modules/default-dict";
import * as LocalLogger from "@renderer/modules/local-logger";
import {AkItem, EndpointType} from "@renderer/modules/auth";
import {listDomains} from "@renderer/modules/qiniu-client";
import {useKodoNavigator} from "@renderer/modules/kodo-address";
import {isExternalPathItem} from "@renderer/modules/user-config-store";

const PUB_S3_LINK_MAX_LIFETIME = 1 * Duration.Day;
const PVT_S3_LINK_MAX_LIFETIME = 7 * Duration.Day;
const CUS_S3_LINK_MAX_LIFETIME = 365 * Duration.Day;
const KODO_LINK_MAX_LIFETIME = 365 * Duration.Day;

function getDisableNonOwnedDomain(): boolean {
  let result = customize.disable.nonOwnedDomain;
  if (result) {
    return result;
  }
  const defaultVal = DefaultDict.get("DISABLE_NON_OWNED_DOMAIN");
  if (defaultVal !== undefined) {
    result = defaultVal;
  }
  return result;
}

// for kodo domain and s3 domain
export interface DomainAdapter extends Domain {
  linkMaxLifetime: number, // ms
}

export const NON_OWNED_DOMAIN: DomainAdapter = {
  name: "non-owned-domain",
  protocol: "",
  private: true,
  protected: false,
  type: 'others',
  apiScope: "s3",
  linkMaxLifetime: PUB_S3_LINK_MAX_LIFETIME,
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
  canDefaultS3Domain: boolean,
  preferBackendMode?: BackendMode,
}

export default function useLoadDomains({
  user,
  regionId,
  bucketName,
  shouldAutoReload,
  canDefaultS3Domain,
  preferBackendMode,
}: useLoadDomainsProps) {
  const {currentAddress} = useKodoNavigator();

  async function loadDomains() {
    if (!user) {
      return;
    }

    if (user.endpointType === EndpointType.ShareSession) {
      setLoadDomainsState({
        loading: false,
        domains: [{
          ...NON_OWNED_DOMAIN,
        }],
      });
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

    if (isExternalPathItem(currentAddress)) {
      setLoadDomainsState({
        loading: false,
        domains: [
          {...NON_OWNED_DOMAIN},
        ],
      });
      return;
    }

    setLoadDomainsState(v => ({
      ...v,
      loading: true,
    }));

    const opt = {
      id: user.accessKey,
      secret: user.accessSecret,
      endpointType: user.endpointType,
      preferKodoAdapter: preferBackendMode === BackendMode.Kodo,
      preferS3Adapter: preferBackendMode === BackendMode.S3,
    };
    const domains: DomainAdapter[] = (await listDomains(regionId, bucketName, opt))
      .map(d => ({
        ...d,
        linkMaxLifetime: d.apiScope === "kodo"
          ? KODO_LINK_MAX_LIFETIME
          : CUS_S3_LINK_MAX_LIFETIME,
      }));

    if (canDefaultS3Domain && !getDisableNonOwnedDomain()) {
      const s3Domain = {
        ...NON_OWNED_DOMAIN,
      };
      if (user.endpointType === EndpointType.Private) {
        s3Domain.linkMaxLifetime = PVT_S3_LINK_MAX_LIFETIME;
      }
      domains.unshift(s3Domain);
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
