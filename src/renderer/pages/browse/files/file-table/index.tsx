import React, {useMemo} from "react";
import BaseTable, {AutoResizer} from "react-base-table";
import classNames from "classnames";

import StorageClass from "@common/models/storage-class";

import {useI18n} from "@renderer/modules/i18n";
import {FileItem} from "@renderer/modules/qiniu-client";
import EmptyHolder from "@renderer/components/empty-holder";

import {LOAD_MORE_THRESHOLD, TABLE_ROW_HEIGHT} from "../const"
import {OperationName, FileRowData} from "../types";
import AutoFillFirstView from "../auto-fill-first-view";
import OverlayHolder from "../overlay-holder";
import {getColumns} from "./columns";
import "./file-table.scss";

interface FileTableProps {
  regionId?: string,
  availableStorageClasses?: Record<string, StorageClass>,
  loading: boolean,
  hasMore: boolean,
  loadMoreFailed: boolean,
  onLoadMore: () => void,
  data: FileItem.Item[],
  selectedFiles: Map<string, FileItem.Item>,
  onSelectFiles: (file: FileItem.Item[], checked: boolean) => void,
  onClickFile: (file: FileItem.Item) => void,
  onDoubleClickFile: (file: FileItem.Item) => void,
  onAction: (action: OperationName, file: FileItem.Item) => void,
}

const FileTable: React.FC<FileTableProps> = ({
  regionId,
  availableStorageClasses,
  loading,
  hasMore,
  loadMoreFailed,
  onLoadMore,
  data,
  selectedFiles,
  onSelectFiles,
  onClickFile,
  onDoubleClickFile,
  onAction,
}) => {
  const {translate} = useI18n();
  const rowData: FileRowData[] = useMemo(() =>
    data.map(item => ({
        ...item,
        id: item.path.toString(),
        isSelected: selectedFiles.has(item.path.toString()),
        regionId,
      })
    ), [data, selectedFiles, regionId]);

  const isSelectedAll = rowData.length > 0 && selectedFiles.size === rowData.length;
  const loadingMore = rowData.length > 0 && loading;

  const columns = getColumns({
    availableStorageClasses,
    isSelectedAll: isSelectedAll,
    onToggleSelectAll: (checked: boolean) => onSelectFiles(rowData, checked),
    onClickFile,
    onDoubleClickFile,
    onAction,
  });

  // load more
  const handleLoadMore = () => {
    if (!hasMore || loadingMore) {
      return;
    }
    onLoadMore();
  };

  return (
    <div className="no-selectable file-base-table w-100 h-100">
      <AutoResizer>
        {({width, height}) => (
          <AutoFillFirstView
            height={height}
            rowData={rowData}
            rowHeight={TABLE_ROW_HEIGHT}
            onLoadMore={handleLoadMore}
          >
            <BaseTable
              className="bt-bordered"
              // select all will not work, if ignoreFunctionInColumnCompare
              // see https://github.com/Autodesk/react-base-table#closure-problem-in-custom-renderers
              ignoreFunctionInColumnCompare={false}
              width={width}
              height={height}
              data={rowData}
              columns={columns}
              headerHeight={TABLE_ROW_HEIGHT}
              rowHeight={TABLE_ROW_HEIGHT}
              // estimatedRowHeight={32}
              rowClassName={({rowData, rowIndex}) => classNames({
                "bg-highlight bg-opacity-50": !rowData.isSelected && Boolean(rowData.withinFourHours),
                "bg-primary bg-opacity-10": rowData.isSelected,
                "row-striped": rowIndex % 2 === 1,
              })}
              rowProps={({rowData}) => ({
                onClick: () => onSelectFiles([rowData], !rowData.isSelected),
              })}
              onEndReachedThreshold={LOAD_MORE_THRESHOLD}
              onEndReached={handleLoadMore}
              emptyRenderer={
                <EmptyHolder
                  icon={
                    <i
                      className="bi bi-inbox"
                      style={{
                        fontSize: '4rem',
                        lineHeight: 1,
                      }}
                    />
                  }
                  subtitle={
                    <span
                      className="text-body mt-2"
                    >
                      {translate("browse.fileTable.emptyHint")}
                    </span>
                  }
                  loading={loading}
                />
              }
              overlayRenderer={
                <OverlayHolder
                  loadingMore={loadingMore}
                  loadMoreFailed={loadMoreFailed}
                  onLoadMoreManually={handleLoadMore}
                />
              }
            />
          </AutoFillFirstView>
        )}
      </AutoResizer>
    </div>
  )
};

export default FileTable;
