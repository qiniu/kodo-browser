import React, {useState, useSyncExternalStore} from "react";
import {Region} from "kodo-s3-adapter-sdk";

import {BucketItem} from "@renderer/modules/qiniu-client";

import {useI18n} from "@renderer/modules/i18n";
import {appPreferences, ContentViewStyle} from "@renderer/modules/user-config-store";

import BucketToolBar from "./bucket-tool-bar";
import BucketTable from "./bucket-table";
import BucketGrid from "./bucket-grid";

interface BucketsProps {
  data: BucketItem[],
  regions: Region[],
  loading: boolean,
  onOperatedBucket: (bucket?: BucketItem) => void,
}

const Buckets: React.FC<BucketsProps> = ({
  data: buckets,
  regions,
  loading: propsLoading,
  onOperatedBucket,
}) => {
  const {currentLanguage} = useI18n();

  const [selectedBucket, setSelectedBucket] = useState<BucketItem | null>(null);
  const {
    state: appPreferencesState,
    data: appPreferencesData,
  } = useSyncExternalStore(
    appPreferences.store.subscribe,
    appPreferences.store.getSnapshot,
  );
  const loading = propsLoading || !appPreferencesState.initialized;

  // search bucket
  const [bucketSearchText, setBucketSearchText] = useState("");
  const handleSearchBucket = (searchName: string) => {
    setBucketSearchText(searchName);
  }

  // view style
  const viewStyle = appPreferencesData.contentViewStyle;
  const handleChangeViewStyle = (style: ContentViewStyle) => {
    appPreferences.set("contentViewStyle", style);
  };

  // computed state
  const bucketsWithRegionName = buckets.map(b => {
    const region = regions.find(r => r.s3Id === b.regionId);
    return {
      ...b,
      regionName:
        region?.translatedLabels?.[currentLanguage] ??
        region?.label ??
        b.regionId,
    };
  });

  // handle operatedBucket
  const handleOperatedBucket = (bucket?: BucketItem) => {
    if (bucket && bucket.name === selectedBucket?.name) {
      setSelectedBucket(bucket);
    }
    onOperatedBucket(bucket);
  };

  // render
  return (
    <>
      <BucketToolBar
        searchTotal={buckets.length}
        selectedBucket={selectedBucket}
        viewStyle={viewStyle}
        onChangeView={handleChangeViewStyle}
        onSearch={handleSearchBucket}
        onCreatedBucket={handleOperatedBucket}
        onUpdatedBucketRemark={handleOperatedBucket}
        onDeletedBucket={handleOperatedBucket}
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
