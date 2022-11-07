import React from "react";
import {Form} from "react-bootstrap";

import {CellDataProps} from "../types"

export interface FileCheckboxHeaderProps {
  isSelectedAll: boolean,
  onToggleSelectAll: (selectAll: boolean) => void,
}

export const FileCheckboxHeader: React.FC<FileCheckboxHeaderProps> = ({
  isSelectedAll,
  onToggleSelectAll,
}) => {
  return (
    <Form.Check
      checked={isSelectedAll}
      name="selectedFile"
      type="checkbox"
      onChange={() => onToggleSelectAll(!isSelectedAll)}
    />
  );
};

export interface FileCheckboxCellProps {
}

const FileCheckbox: React.FC<CellDataProps<boolean> & FileCheckboxCellProps> = ({
  cellData,
}) => {
  // select action will be handled on row,
  // so there isn't a onChange handler.

  return (
    <Form.Check
      className="text-center"
      checked={cellData}
      name="selectedFile"
      type="checkbox"
      onChange={() => {
      }}
    />
  )
};

export default FileCheckbox;
