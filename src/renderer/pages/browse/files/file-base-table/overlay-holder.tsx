import React from "react";

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

  if (loadingMore) {
    return (
      <div className="loading-more-layer text-bg-info bg-opacity-10">
        <LoadingHolder
          horizontal
          size="sm"
          text={translate("browse.fileTable.loadMore")}
        />
      </div>
    )
  }
  return null;
};

export default OverlayHolder;
