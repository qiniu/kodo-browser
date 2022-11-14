import React, {useEffect, useState} from "react";
import {Region} from "kodo-s3-adapter-sdk";
import {toast} from "react-hot-toast";

import * as LocalLogger from "@renderer/modules/local-logger";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {useKodoNavigator} from "@renderer/modules/kodo-address";
import {BucketItem, getRegions, listAllBuckets} from "@renderer/modules/qiniu-client";
import {Provider as FileOperationProvider} from "@renderer/modules/file-operation";

import Buckets from "./buckets";
import Files from "./files";
import LoadingHolder from "@renderer/components/loading-holder";

interface ContentsProps {
  toggleRefresh?: boolean,
}

const Contents: React.FC<ContentsProps> = ({
  toggleRefresh,
}) => {
  const {currentUser} = useAuth();
  const {bucketName} = useKodoNavigator();

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
    Promise.all([getRegions(opt), listAllBuckets(opt)])
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

  const bucket = bucketName ? bucketsMap.get(bucketName) : undefined;
  const region = bucket?.regionId ? regionsMap.get(bucket?.regionId) : undefined;

  return (
    <FileOperationProvider>
      <div
        style={{
          position: "relative",
          height: "calc(100vh - 6rem)",
        }}
        className="d-flex flex-column"
      >
        {
          !bucketName
            ? <Buckets
              loading={loadingBucketAndRegion}
              regions={[...regionsMap.values()]}
              data={[...bucketsMap.values()]}
              onOperatedBucket={handleReloadBuckets}
            />
            : loadingBucketAndRegion
              ? <LoadingHolder/>
              : <Files
                // load files need finish fetching buckets and regions
                toggleRefresh={toggleRefresh}
                bucket={bucket}
                region={region}
              />
        }
      </div>
    </FileOperationProvider>
  );
};

export default Contents;
