import React, {useEffect, useState} from "react";
import {useSearchParams} from "react-router-dom";
import {Region} from "kodo-s3-adapter-sdk";
import {toast} from "react-hot-toast";

import {BackendMode} from "@common/qiniu";

import * as LocalLogger from "@renderer/modules/local-logger";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {isExternalPathItem, useKodoNavigator} from "@renderer/modules/kodo-address";
import {
  BucketItem,
  GetAdapterOptionParam,
  getRegions,
  listAllBuckets,
  privateEndpointPersistence
} from "@renderer/modules/qiniu-client";
import {Provider as FileOperationProvider} from "@renderer/modules/file-operation";

import LoadingHolder from "@renderer/components/loading-holder";

import Buckets from "./buckets";
import ExternalPaths from "./external-paths";
import Files from "./files";


/*
 * get all regions from server and merge to local regions configuration if set in private endpoint.
 */
async function listAllRegions(endpointType: EndpointType, opt: GetAdapterOptionParam): Promise<Region[]> {
  let regionsFromFetch: Region[];

  // public
  if (endpointType === EndpointType.Public) {
    regionsFromFetch = await getRegions(opt);
    return regionsFromFetch;
  }

  // private
  const regionsFromEndpointConfig = privateEndpointPersistence
    .read()
    .regions;
  if (!regionsFromEndpointConfig.length) {
    regionsFromFetch = await getRegions(opt);
    return regionsFromFetch;
  }

  // private add configuration
  try {
    regionsFromFetch = await getRegions(opt);
  } catch {
    return regionsFromEndpointConfig
      .map(r => {
        const result = new Region(r.identifier, r.identifier, r.label);
        result.s3Urls = [r.endpoint];
        return result
      });
  }
  return regionsFromEndpointConfig.map(r => {
    const storageClasses = regionsFromFetch
      .find(i => i.s3Id === r.identifier)?.storageClasses ?? []
    const region = new Region(
      r.identifier,
      r.identifier,
      r.label,
      {},
      storageClasses,
    );
    region.s3Urls = [r.endpoint];
    return region
  });
}

interface ContentsProps {
  toggleRefresh?: boolean,
}

const Contents: React.FC<ContentsProps> = ({
  toggleRefresh,
}) => {
  const [searchParams, _] = useSearchParams();

  const {currentUser} = useAuth();
  const {bucketName, currentAddress} = useKodoNavigator();

  // initial regions, storage classes, buckets.
  // they will update when refresh bucket view.
  const [loadingBucketAndRegion, setLoadingBucketAndRegion] = useState<boolean>(true);
  const [regionsMap, setRegionsMap] = useState<Map<string, Region>>(new Map());
  const [bucketsMap, setBucketsMap] = useState<Map<string, BucketItem>>(new Map());
  const loadRegionsAndBuckets = () => {
    if (!currentUser) {
      return;
    }

    setLoadingBucketAndRegion(true);

    const opt = {
      id: currentUser.accessKey,
      secret: currentUser.accessSecret,
      isPublicCloud: currentUser.endpointType === EndpointType.Public,
    };
    Promise.all([listAllRegions(currentUser.endpointType, opt), listAllBuckets(opt)])
      .then(([regions, buckets]) => {
        setRegionsMap(regions.reduce((res, r) => {
          res.set(r.s3Id, r);
          return res;
        }, new Map<string, Region>()));
        setBucketsMap(buckets.reduce((res, b) => {
          res.set(b.name, b);
          return res;
        }, new Map<string, BucketItem>()));
        setLoadingBucketAndRegion(false);
      })
      .catch(err => {
        toast.error(err.toString());
        LocalLogger.error(err);
      });
  };
  const handleReloadBuckets = () => {
    loadRegionsAndBuckets();
  }
  useEffect(() => {
    loadRegionsAndBuckets();
  }, []);
  // refresh when bucket view
  useEffect(() => {
    if (!bucketName && !loadingBucketAndRegion) {
      loadRegionsAndBuckets();
    }
  }, [toggleRefresh]);

  // calc bucket and region
  let bucket = bucketName ? bucketsMap.get(bucketName) : undefined;
  if (!bucket && bucketName && isExternalPathItem(currentAddress)) {
    bucket = {
      id: bucketName,
      name: bucketName,
      // can't get create data of an external bucket.
      createDate: new Date(NaN),
      regionId: currentAddress.regionId,
      preferBackendMode: BackendMode.S3,
    };
  }
  const region = bucket?.regionId ? regionsMap.get(bucket.regionId) : undefined;

  // render
  const renderContent = () => {
    if (!bucketName) {
      if (searchParams.has("external-mode")) {
        return (
          <ExternalPaths
            toggleRefresh={toggleRefresh}
            regions={[...regionsMap.values()]}
          />
        );
      }
      return (
        <Buckets
          loading={loadingBucketAndRegion}
          regions={[...regionsMap.values()]}
          data={[...bucketsMap.values()]}
          onOperatedBucket={handleReloadBuckets}
        />
      );
    }

    if (loadingBucketAndRegion) {
      return (
        <LoadingHolder/>
      );
    }

    return (
      <Files
        toggleRefresh={toggleRefresh}
        bucket={bucket}
        region={region}
      />
    );
  }

  return (
    <FileOperationProvider
      bucketGrantedPermission={bucket?.grantedPermission}
      bucketPreferBackendMode={bucket?.preferBackendMode}
    >
      <div
        style={{
          position: "relative",
          height: "calc(100vh - 6rem)",
        }}
        className="d-flex flex-column"
      >
        {renderContent()}
      </div>
    </FileOperationProvider>
  );
};

export default Contents;
