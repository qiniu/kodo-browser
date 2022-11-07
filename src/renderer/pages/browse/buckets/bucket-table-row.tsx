import React from "react";
import {Form} from "react-bootstrap";
import classNames from "classnames";
import moment from "moment";

import {BucketItem} from "@renderer/modules/qiniu-client";

interface BucketTableRowProps {
  data: BucketItem,
  isSelected: boolean,
  onClickRow: (bucket: BucketItem) => void,
  onClickBucket: (bucket: BucketItem) => void,
}

const BucketTableRow: React.FC<BucketTableRowProps> = (props) => {
  const {
    data: bucket,
    isSelected,
    onClickRow,
    onClickBucket,
  } = props;

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
            <i className="fa fa-database me-1 text-brown"/>
            {bucket.name}
          </span>
      </td>
      <td>{bucket.regionName ?? bucket.regionId}</td>
      <td>{moment(bucket.createDate).format("YYYY-MM-DD HH:mm:ss")}</td>
    </tr>
  )
};

export default BucketTableRow;
