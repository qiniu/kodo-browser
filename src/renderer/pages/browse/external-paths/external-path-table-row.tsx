import React from "react";
import {Form} from "react-bootstrap";

import {ExternalPathItem} from "@renderer/modules/user-config-store";

export interface ExternalPathRowData extends ExternalPathItem{
  regionName: string,
}

interface ExternalPathTableRowProps {
  data: ExternalPathRowData,
  isSelected: boolean,
  onClickRow: (item: ExternalPathRowData) => void,
  onClickPath: (item: ExternalPathRowData) => void,
}

const ExternalPathTableRow: React.FC<ExternalPathTableRowProps> = ({
  data,
  isSelected,
  onClickRow,
  onClickPath,
}) => {
  return (
    <tr onClick={() => onClickRow(data)}>
      <td>
        <Form.Check
          className="text-center"
          checked={isSelected}
          name="selectedPath"
          type="radio"
          onChange={() => {
          }}
        />
      </td>
      <td className="align-middle">
        <span
          className="text-link"
          onClick={() => onClickPath(data)}
        >
          <i className="bi bi-signpost-2-fill text-brown me-1"/>
          {data.protocol}{data.path}
        </span>
      </td>
      <td className="align-middle">
        {data.regionName}
      </td>
    </tr>
  );
};

export default ExternalPathTableRow;
