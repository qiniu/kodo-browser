import React from "react";
import {ColumnShape} from "react-base-table";
import moment from "moment";

import {byteSizeFormat} from "@common/const/byte-size";
import StorageClass from "@common/models/storage-class";

import {getLang, translate} from "@renderer/modules/i18n";
import {FileItem} from "@renderer/modules/qiniu-client";

import {FileRowData} from "../../types";
import FileName, {FileNameCellProps} from "./file-name";
import FileCheckbox, {FileCheckboxCellProps, FileCheckboxHeader, FileCheckboxHeaderProps} from "./file-checkbox";
import FileOperations, {FileOperationsCellProps} from "./file-operations";

type GetFileTableColumnsProps = {
    availableStorageClasses?: Record<string, StorageClass>
  }
  & FileNameCellProps
  & FileCheckboxHeaderProps
  & FileCheckboxCellProps
  & FileOperationsCellProps;

export function getColumns({
  availableStorageClasses,
  isSelectedAll,
  onToggleSelectAll,
  onClickFile,
  onDoubleClickFile,
  onAction,
}: GetFileTableColumnsProps): ColumnShape<FileRowData>[] {
  const currentLanguage = getLang();
  return [
    {
      key: "__selection__",
      headerRenderer: () => (
        <FileCheckboxHeader
          isSelectedAll={isSelectedAll}
          onToggleSelectAll={onToggleSelectAll}
        />
      ),
      dataKey: "isSelected",
      width: 40,
      flexShrink: 0,
      cellRenderer: ({cellData, rowData}) => (
        <FileCheckbox rowData={rowData} cellData={cellData}/>
      ),
    },
    {
      key: "fileName",
      title: translate("browse.fileTable.fileName"),
      dataKey: "name",
      width: 0,
      resizable: true,
      flexGrow: 10,
      cellRenderer: ({cellData, rowData}) => (
        <FileName
          cellData={cellData}
          rowData={rowData}
          onClickFile={onClickFile}
          onDoubleClickFile={onDoubleClickFile}
        />
      ),
    },
    {
      key: "fileTypeOrSize",
      title: translate("browse.fileTable.fileTypeOrSize"),
      width: 100,
      flexGrow: 1,
      dataGetter: ({rowData: file}) =>
        FileItem.isItemFile(file)
          ? byteSizeFormat(file.size)
          : translate("common.directory"),
    },
    {
      key: "fileStorageClass",
      title: translate("browse.fileTable.fileStorageClass"),
      width: 128,
      flexGrow: 1,
      dataGetter: ({rowData: file}) =>
        FileItem.isItemFile(file)
          ? availableStorageClasses?.[file.storageClass].nameI18n[currentLanguage]
          ?? file.storageClass
          : "-"
    },
    {
      key: "fileModifyDate",
      title: translate("browse.fileTable.fileModifyDate"),
      width: 192,
      flexGrow: 1,
      dataGetter: ({rowData: file}) =>
        FileItem.isItemFile(file)
          ? moment(file.lastModified).format("YYYY-MM-DD HH:mm:ss")
          : "-"
    },
    {
      key: "fileOperation",
      title: translate("browse.fileTable.fileOperation"),
      width: 150,
      flexGrow: 1,
      cellRenderer: ({rowData, cellData}) => (
        <FileOperations
          rowData={rowData}
          cellData={cellData}
          onAction={onAction}
        />
      ),
    },
  ];
}
