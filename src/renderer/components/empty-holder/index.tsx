import React from "react";

import {useI18n} from "@renderer/modules/i18n";

import LoadingHolder from "../loading-holder";

interface EmptyHolderProps {
  icon?: React.ReactElement,
  subtitle?: React.ReactElement,
  loading?: boolean,
  col?: number,
}

const EmptyHolder: React.FC<EmptyHolderProps> = ({
  icon = null,
  subtitle = null,
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
        <td className="text-center text-body text-opacity-25" colSpan={col}>
          <div className="d-flex flex-column justify-content-center align-items-center">
            {icon}
            <span>{translate("common.empty")}</span>
            {subtitle}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="d-flex flex-column justify-content-center align-items-center text-body text-opacity-25 w-100 h-100">
      {icon}
      <span>{translate("common.empty")}</span>
      {subtitle}
    </div>
  );
};

export default EmptyHolder;
