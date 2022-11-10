import React, {useState} from "react";
import {Region} from "kodo-s3-adapter-sdk";

import {BucketItem} from "@renderer/modules/qiniu-client";

import BucketToolBar from "./bucket-tool-bar";
import BucketTable from "./bucket-table";
import {useI18n} from "@renderer/modules/i18n";
import BucketGrid from "@renderer/pages/browse/buckets/bucket-grid";
import Settings, {ContentViewStyle} from "@renderer/modules/settings";

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

  // search bucket
  const [bucketSearchText, setBucketSearchText] = useState("");
  const handleSearchBucket = (searchName: string) => {
    setBucketSearchText(searchName);
  }

  // view style
  const [viewStyle, setViewStyle] = useState(Settings.contentViewStyle);
  const handleChangeViewStyle = (style: ContentViewStyle) => {
    setViewStyle(style);
    Settings.contentViewStyle = style;
  };

  // computed state
  const bucketsWithRegionName = buckets.map(b => ({
    ...b,
    regionName: regions.find(r => r.s3Id === b.regionId)?.translatedLabels?.[currentLanguage] ?? b.regionId,
  }))

  // render
  return (
    <>
      <BucketToolBar
        searchTotal={buckets.length}
        selectedBucket={selectedBucket}
        viewStyle={viewStyle}
        onChangeView={handleChangeViewStyle}
        onSearch={handleSearchBucket}
        onCreatedBucket={onOperatedBucket}
        onDeletedBucket={onOperatedBucket}
      />
      {
        viewStyle === ContentViewStyle.Table
          ? <BucketTable
            loading={loading}
            buckets={
              bucketsWithRegionName
                .filter(bucket => bucket.name.includes(bucketSearchText))
            }
            selectedBucket={selectedBucket}
            onChangeSelectedBucket={setSelectedBucket}
          />
          : <BucketGrid
            loading={loading}
            buckets={
              bucketsWithRegionName
                .filter(bucket => bucket.name.includes(bucketSearchText))
            }
            selectedBucket={selectedBucket}
            onChangeSelectedBucket={setSelectedBucket}
          />
      }
    </>
  );
};

export default Buckets;
