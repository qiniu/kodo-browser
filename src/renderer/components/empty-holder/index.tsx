import React from "react";

import {useI18n} from "@renderer/modules/i18n";

import LoadingHolder from "../loading-holder";

interface EmptyHolderProps {
  loading?: boolean,
  col?: number,
}

const EmptyHolder: React.FC<EmptyHolderProps> = ({
  loading,
  col,
}) => {
  const {translate} = useI18n();

  if (loading) {
    return (
      <LoadingHolder col={col}/>
    );
  }

  if (col) {
    return (
      <tr>
        <td className="text-center text-muted" colSpan={col}>{translate("common.empty")}</td>
      </tr>
    );
  }

  return (
    <div className="d-flex justify-content-center align-items-center text-muted w-100 h-100">
      {translate("common.empty")}
    </div>
  );
};

export default EmptyHolder;
