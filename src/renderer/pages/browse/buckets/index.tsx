import React, {useState} from "react";
import {Region} from "kodo-s3-adapter-sdk";

import {BucketItem} from "@renderer/modules/qiniu-client";

import BucketToolBar from "./bucket-tool-bar";
import BucketTable from "./bucket-table";
import {useI18n} from "@renderer/modules/i18n";

interface BucketsProps {
  data: BucketItem[],
  regions: Region[],
  loading: boolean,
  onOperatedBucket: () => void,
}

const Buckets: React.FC<BucketsProps> = ({
  data: buckets,
  regions,
  loading,
  onOperatedBucket,
}) => {
  const {currentLanguage} = useI18n();

  const [selectedBucket, setSelectedBucket] = useState<BucketItem | null>(null);

  const [bucketSearchText, setBucketSearchText] = useState("");
  const handleSearchBucket = (searchName: string) => {
    setBucketSearchText(searchName);
  }

  const bucketsWithRegionName = buckets.map(b => ({
    ...b,
    regionName: regions.find(r => r.s3Id === b.regionId)?.translatedLabels?.[currentLanguage] ?? b.regionId,
  }))

  return (
    <>
      <BucketToolBar
        searchTotal={buckets.length}
        selectedBucket={selectedBucket}
        onSearch={handleSearchBucket}
        onCreatedBucket={onOperatedBucket}
        onDeletedBucket={onOperatedBucket}
      />
      <BucketTable
        loading={loading}
        buckets={
          bucketsWithRegionName
            .filter(bucket => bucket.name.includes(bucketSearchText))
        }
        selectedBucket={selectedBucket}
        onChangeSelectedBucket={bucket => setSelectedBucket(bucket)}
      />
    </>
  );
};

export default Buckets;
