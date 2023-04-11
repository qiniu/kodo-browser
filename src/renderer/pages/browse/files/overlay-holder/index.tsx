import React, {useCallback, useEffect, useState} from "react";
import lodash from "lodash";

import {useI18n} from "@renderer/modules/i18n";
import LoadingHolder from "@renderer/components/loading-holder";

import "./overlay-holder.scss";

interface OverlayHolderProps {
  loadingMore?: boolean,
}

const OverlayHolder: React.FC<OverlayHolderProps> = ({
  loadingMore,
}) => {
  const {translate} = useI18n();

  const [showLoadingMore, setShowLoadingMore] = useState(false);
  const setShowLoadingMoreDebounced = useCallback(
    lodash.debounce(setShowLoadingMore, 200, {leading: false, trailing: true}),
    []);

  useEffect(() => {
    if (!loadingMore) {
      setShowLoadingMoreDebounced(false);
      return;
    }
    setShowLoadingMore(true);
  }, [loadingMore]);

  return (
    <>
      {
        showLoadingMore &&
        <div className="loading-more-layer text-bg-info bg-opacity-10">
          <LoadingHolder
            horizontal
            size="sm"
            text={translate("browse.fileTable.loadMore")}
          />
        </div>
      }
    </>
  );
};

export default OverlayHolder;
