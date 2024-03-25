import {FileItem} from "@renderer/modules/qiniu-client";

export enum OperationName {
  Restore = "restore",
  Download = "download",
  GenerateLink = "generateLink",
  ChangeStorageClass = "changeStorageClass",
  Delete = "delete",
}

export type FileRowData = FileItem.Item & {
  id: string,
  isSelected: boolean,
  regionId?: string,
  _index: number,
};

export interface RowCellDataProps<T = string> {
  rowData: FileRowData,
  cellData: T,
}
