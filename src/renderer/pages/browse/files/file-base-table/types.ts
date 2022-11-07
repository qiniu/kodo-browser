import {FileItem} from "@renderer/modules/qiniu-client";

export type FileRowData = FileItem.Item & {
  id: string,
  isSelected: boolean,
};

export interface CellDataProps<T = string> {
  rowData: FileRowData,
  cellData: T,
}

export enum OperationName {
  Restore = "restore",
  Download = "download",
  GenerateLink = "generateLink",
  ChangeStorageClass = "changeStorageClass",
  Delete = "delete",
}
