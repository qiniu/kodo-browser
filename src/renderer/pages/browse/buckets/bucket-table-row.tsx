import React from "react";
import {Form} from "react-bootstrap";
import classNames from "classnames";
import moment from "moment";

import {BucketItem} from "@renderer/modules/qiniu-client";
import {useI18n} from "@renderer/modules/i18n";
import useIsOverflow from "@renderer/modules/hooks/use-is-overflow";
import TooltipText from "@renderer/components/tooltip-text";
import Duration from "@common/const/duration";

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

  // is overflow
  const {
    ref: bucketRemarkRef,
    isOverflow: bucketRemarkIsOverflow,
  } = useIsOverflow();
  const {
    ref: bucketNameRef,
    isOverflow: bucketNameIsOverflow,
  } = useIsOverflow();

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
      {/* The `line height: 0` fixes height incorrect of row causing by `overflow-ellipsis-inline` */}
      <td style={{lineHeight: 0}}>
        <div>
          <TooltipText
            disabled={!bucket.grantedPermission && !bucketNameIsOverflow}
            tooltipPlacement="right"
            delay={{
              show: Duration.Second,
              hide: 0,
            }}
            tooltipContent={
              <div className="text-start">
                {
                  bucketNameIsOverflow &&
                  <div className="text-break-all">
                    {bucket.name}
                  </div>
                }
                <div className="text-info">
                  {grantedPermissionTip}
                </div>
              </div>
            }
          >
            <span
              tabIndex={0}
              className="text-link overflow-ellipsis-inline"
              style={{
                ["--line-num" as any]: bucket.remark ? 1 : 2,
                lineHeight: "var(--bs-body-line-height)",
              }}
              ref={bucketNameRef}
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
        </div>
        {
          bucket.remark &&
          <div>
            <TooltipText
              disabled={!bucketRemarkIsOverflow}
              tooltipPlacement="right"
              tooltipContent={<div className="text-start">{bucket.remark}</div>}
            >
              <small
                ref={bucketRemarkRef}
                className="text-secondary overflow-ellipsis-inline"
                style={{lineHeight: "var(--bs-body-line-height)"}}
              >
                {bucket.remark}
              </small>
            </TooltipText>
          </div>
        }
      </td>
      {/* may empty string, so use `||` instead of `??` */}
      <td className="align-middle">{bucket.regionName || bucket.regionId}</td>
      <td className="align-middle">{moment(bucket.createDate).format("YYYY-MM-DD HH:mm:ss")}</td>
    </tr>
  )
};

export default BucketTableRow;
