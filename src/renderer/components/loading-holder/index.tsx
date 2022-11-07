import React from "react";
import {Spinner} from "react-bootstrap";
import classNames from "classnames";

import {useI18n} from "@renderer/modules/i18n";

interface LoadingHolderProps {
  col?: number,
  horizontal?: boolean,
  size?: "sm"
  text?: string,
}

const LoadingHolder: React.FC<LoadingHolderProps> = ({
  col,
  horizontal,
  size,
  text,
}) => {
  const {translate} = useI18n();

  if (col) {
    return (
      <tr>
        <td className="text-center" colSpan={col}>
          <Spinner animation="border"/>
          <div>{translate("common.loading")}</div>
        </td>
      </tr>
    )
  }

  return (
    <div className={
      classNames("d-flex justify-content-center align-items-center w-100 h-100", {
        "flex-column": !horizontal,
      })
    }>
      <Spinner size={size} animation="border" variant="primary"/>
      <div className="p-1">{text ?? translate("common.loading")}</div>
    </div>
  );
};

export default LoadingHolder;
