import React, {useCallback, useEffect, useState} from "react";
import lodash from "lodash";

import {useI18n} from "@renderer/modules/i18n";
import LoadingHolder from "@renderer/components/loading-holder";

import "./overlay-holder.scss";

interface OverlayHolderProps {
  onLoadMoreManually?: () => void,
  loadMoreFailed?: boolean,
  loadingMore?: boolean,
}

const OverlayHolder: React.FC<OverlayHolderProps> = ({
  onLoadMoreManually,
  loadMoreFailed,
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

  if (loadMoreFailed) {
    return (
      <>
        <div className="load-more-layer text-bg-danger bg-opacity-10">
          <div className="text-center p-1">
            <i className="bi bi-exclamation-triangle-fill text-danger me-1"/>
            <span className="text-body">
              {translate("browse.fileTable.loadMoreFailed")}
            </span>
            <span
              className="text-link"
              style={{
                pointerEvents: "auto",
              }}
              onClick={onLoadMoreManually}
            >
              {translate("common.clickToRetry")}
            </span>
          </div>
        </div>
      </>
    );
  }

  if (showLoadingMore) {
    return (
      <>
        <div className="load-more-layer text-bg-info bg-opacity-10">
          <LoadingHolder
            horizontal
            size="sm"
            text={translate("browse.fileTable.loadMore")}
          />
        </div>
      </>
    );
  }

  return null;
};

export default OverlayHolder;
