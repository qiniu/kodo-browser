import React, {MouseEventHandler} from "react";
import {Card} from "react-bootstrap";

import {BucketItem} from "@renderer/modules/qiniu-client";

interface BucketCellProps {
  data: BucketItem,
  isSelected: boolean,
  onClick: (bucket: BucketItem) => void,
  onDoubleClick: (bucket: BucketItem) => void,
}

const BucketCell: React.FC<BucketCellProps> = ({
  data,
  isSelected,
  onClick,
  onDoubleClick,
}) => {
  const handleClick: MouseEventHandler = (e) => {
    switch (e.detail) {
      case 1: {
        return onClick(data);
      }
      case 2: {
        return onDoubleClick(data);
      }
    }
  }

  return (
    <Card
      border={isSelected ? "primary" : undefined}
      className="bucket-cell card-horizontal h-100"
      onClick={handleClick}
    >
      <Card.Img
        as="i"
        className="text-center fa fa-database me-1 text-brown"
      />
      <Card.Body>
        <Card.Title className="overflow-ellipsis-one-line w-100">
          {data.name}
        </Card.Title>
        <Card.Subtitle className="text-secondary">
          {data.regionName ?? data.regionId}
        </Card.Subtitle>
      </Card.Body>
      {
        isSelected &&
        <div className="selected-mark">
          <i className="bi bi-check text-primary"/>
        </div>
      }
    </Card>
  );
};

export default BucketCell;
