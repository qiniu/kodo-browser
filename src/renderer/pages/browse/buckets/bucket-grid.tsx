import React from "react";
import classNames from "classnames";
import {BucketItem} from "@renderer/modules/qiniu-client";
import {useKodoNavigator} from "@renderer/modules/kodo-address";
import EmptyHolder from "@renderer/components/empty-holder";

import BucketCell from "./bucket-grid-cell";
import "./bucket-grid.scss";

interface BucketGridProps {
  loading: boolean,
  buckets: BucketItem[],
  selectedBucket: BucketItem | null,
  onChangeSelectedBucket: (bucket: BucketItem | null) => void,
}

const BucketGrid: React.FC<BucketGridProps> = ({
  loading,
  buckets,
  selectedBucket,
  onChangeSelectedBucket,
}) => {
  const {goTo} = useKodoNavigator();

  const handleClickCell = (bucket: BucketItem) => {
    if (bucket.name === selectedBucket?.name) {
      onChangeSelectedBucket(null);
      return;
    }
    onChangeSelectedBucket(bucket);
  };

  const handleDoubleClickCell = (bucket: BucketItem) => {
    goTo({
      path: `${bucket.name}/`,
    });
  };

  return (
    <div className="no-selectable bucket-grid w-100 h-100">
      <div className="base-grid">
        {
          buckets.map(bucket => (
            <div
              key={bucket.name}
              className={classNames("base-cell p-1", {
                "bg-primary bg-opacity-10": selectedBucket?.name === bucket.name,
              })}
            >
              <BucketCell
                data={bucket}
                isSelected={selectedBucket?.name === bucket.name}
                onClick={handleClickCell}
                onDoubleClick={handleDoubleClickCell}
              />
            </div>
          ))
        }
        {
          !buckets.length &&
          <EmptyHolder loading={loading}/>
        }
      </div>
    </div>
  );
};

export default BucketGrid;
