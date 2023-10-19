import React from "react";
import {Form} from "react-bootstrap";
import classNames from "classnames";
import moment from "moment";

import {BucketItem} from "@renderer/modules/qiniu-client";
import TooltipText from "@renderer/components/tooltip-text";
import {useI18n} from "@renderer/modules/i18n";
import Duration from "@common/const/duration";

interface BucketNameTooltipProps {
  bucket: BucketItem
}

const BucketNameTooltip: React.FC<BucketNameTooltipProps> = ({
  bucket,
}) => {
  const {translate} = useI18n();

  // granted permission text
  let grantedPermissionTip: string | null = null
  if (bucket.grantedPermission === "readonly") {
    grantedPermissionTip = translate("browse.bucketTable.bucketGrantedReadOnly");
  } else if (bucket.grantedPermission === "readwrite") {
    grantedPermissionTip = translate("browse.bucketTable.bucketGrantedReadWrite");
  }

  return (
    <>
      <div className="text-start">
        {bucket.name}
        {
          grantedPermissionTip &&
          <span className="text-info">（{grantedPermissionTip}）</span>
        }
      </div>
      <div className="text-start">
        <small className="text-secondary">{bucket.remark}</small>
      </div>
    </>
  );
};

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
  // icon class name
  let iconClassName = "bi bi-database-fill me-1 text-brown";
  if (bucket.grantedPermission === "readonly") {
    iconClassName = "bic bic-database-fill-eye me-1 text-slate";
  } else if (bucket.grantedPermission === "readwrite") {
    iconClassName = "bic bic-database-fill-pencil me-1 text-slate";
  }

  // render
  return (
    <tr
      className={classNames({"bg-primary bg-opacity-10": isSelected})}
      onClick={() => onClickRow(bucket)}
    >
      <td className="align-middle text-center">
        <Form.Check
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
          delay={{
            show: Duration.Second,
            hide: 0,
          }}
          tooltipContent={<BucketNameTooltip bucket={bucket}/>}
        >
          <div
            className="d-inline-flex flex-column"
          >
            <span
              tabIndex={0}
              className="text-link overflow-ellipsis"
              style={{
                ["--line-num" as any]: bucket.remark ? 1 : 2,
              }}
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
            {
              bucket.remark &&
              <small
                className="text-secondary overflow-ellipsis"
              >
                {bucket.remark}
              </small>
            }
          </div>
        </TooltipText>
      </td>
      {/* may empty string, so use `||` instead of `??` */}
      <td className="align-middle">{bucket.regionName || bucket.regionId}</td>
      <td className="align-middle">{moment(bucket.createDate).format("YYYY-MM-DD HH:mm:ss")}</td>
    </tr>
  )
};

export default BucketTableRow;
