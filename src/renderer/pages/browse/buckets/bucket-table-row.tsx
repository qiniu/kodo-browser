import React from "react";
import {Form} from "react-bootstrap";
import classNames from "classnames";
import moment from "moment";

import {BucketItem} from "@renderer/modules/qiniu-client";
import TooltipText from "@renderer/components/tooltip-text";
import {useI18n} from "@renderer/modules/i18n";

interface BucketTableRowProps {
  data: BucketItem,
  isSelected: boolean,
  onClickRow: (bucket: BucketItem) => void,
  onClickBucket: (bucket: BucketItem) => void,
}

const BucketTableRow: React.FC<BucketTableRowProps> = ({
  data: bucket,
  isSelected,
  onClickRow,
  onClickBucket,
}) => {
  const {translate} = useI18n();

  // icon class name
  let iconClassName = "bi bi-database-fill me-1 text-brown";
  if (bucket.grantedPermission === "readonly") {
    iconClassName = "bic bic-database-fill-eye me-1 text-slate";
  } else if (bucket.grantedPermission === "readwrite") {
    iconClassName = "bic bic-database-fill-pencil me-1 text-slate";
  }

  // granted permission text
  let grantedPermissionTip: string | null = null
  if (bucket.grantedPermission === "readonly") {
    grantedPermissionTip = translate("browse.bucketTable.bucketGrantedReadOnly");
  } else if (bucket.grantedPermission === "readwrite") {
    grantedPermissionTip = translate("browse.bucketTable.bucketGrantedReadWrite");
  }

  // render
  return (
    <tr
      className={classNames({"bg-primary bg-opacity-10": isSelected})}
      onClick={() => onClickRow(bucket)}
    >
      <td>
        <Form.Check
          className="text-center"
          checked={isSelected}
          name="selectedBucket"
          type="radio"
          onChange={() => {
          }}
        />
      </td>
      <td>
        <TooltipText
          tooltipPlacement="right"
          disabled={!bucket.grantedPermission}
          tooltipContent={grantedPermissionTip}
        >
          <span
            tabIndex={0}
            className="text-link"
            onKeyUp={e => {
              if (e.code === "Space") {
                e.stopPropagation();
                onClickBucket(bucket);
              }
            }}
            onClick={e => {
              e.stopPropagation();
              onClickBucket(bucket);
            }}
          >
            <i className={iconClassName}/>
            {bucket.name}
          </span>
        </TooltipText>
      </td>
      <td>{bucket.regionName ?? bucket.regionId}</td>
      <td>{moment(bucket.createDate).format("YYYY-MM-DD HH:mm:ss")}</td>
    </tr>
  )
};

export default BucketTableRow;
