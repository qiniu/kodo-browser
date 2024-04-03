import React, {useCallback, useEffect, useMemo} from "react";
import {useSearchParams} from "react-router-dom";
import {Region} from "kodo-s3-adapter-sdk";
import {toast} from "react-hot-toast";

import {BackendMode} from "@common/qiniu";

import * as LocalLogger from "@renderer/modules/local-logger";
import {useAuth} from "@renderer/modules/auth";
import {useKodoNavigator} from "@renderer/modules/kodo-address";
import {isExternalPathItem} from "@renderer/modules/user-config-store";
import {BucketItem} from "@renderer/modules/qiniu-client";
import {useLoadBuckets, useLoadRegions} from "@renderer/modules/qiniu-client-hooks";
import {Provider as FileOperationProvider} from "@renderer/modules/file-operation";

import LoadingHolder from "@renderer/components/loading-holder";

import Buckets from "./buckets";
import ExternalPaths from "./external-paths";
import Files from "./files";

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
  const {
    loadRegionsState,
    loadRegions,
  } = useLoadRegions({
    user: currentUser,
  });
  const {
    loadBucketsState,
    loadBuckets,
  } = useLoadBuckets({
    user: currentUser,
  })
  const loadingRegionsAndBuckets = loadRegionsState.loading || loadBucketsState.loading;
  const regionsMap = useMemo(() => {
    const m = new Map<string, Region>();
    loadRegionsState.regions.forEach(r => {
      m.set(r.s3Id, r);
    });
    return m;
  }, [loadRegionsState.regions]);
  const bucketsMap = useMemo(() => {
    const m = new Map<string, BucketItem>();
    loadBucketsState.buckets.forEach(b => {
      m.set(b.name, b);
    });
    return m;
  }, [loadBucketsState.buckets]);
  const loadRegionsAndBuckets = useCallback(() => {
    Promise.all([loadRegions(), loadBuckets()])
      .catch(err => {
        toast.error(err.toString());
        LocalLogger.error(err);
      });
  }, [loadRegions, loadBuckets]);
  useEffect(() => {
    loadRegionsAndBuckets();
  }, []);
  // refresh when bucket view
  useEffect(() => {
    if (!bucketName && !loadingRegionsAndBuckets) {
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
          loading={loadingRegionsAndBuckets}
          regions={[...regionsMap.values()]}
          data={[...bucketsMap.values()]}
          onOperatedBucket={loadRegionsAndBuckets}
        />
      );
    }

    if (loadingRegionsAndBuckets) {
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
          ["--bs-body-font-size" as any]: "0.875rem",
        }}
        className="d-flex flex-column"
      >
        {renderContent()}
      </div>
    </FileOperationProvider>
  );
};

export default Contents;
