import React, {useMemo} from "react";
import classNames from "classnames";
import AutoResizer from "react-virtualized-auto-sizer";

import StorageClass from "@common/models/storage-class";

import {FileItem} from "@renderer/modules/qiniu-client";

import {useI18n} from "@renderer/modules/i18n";
import EmptyHolder from "@renderer/components/empty-holder";
import BaseGrid from "@renderer/components/base-grid";

import {LOAD_MORE_THRESHOLD, GRID_CELL_WIDTH, GRID_CELL_HEIGHT} from "../const";
import {FileRowData} from "../types";
// import {OperationName} from "../types";
import OverlayHolder from "../overlay-holder";
import FileCell from "./file-cell";
import "./file-grid.scss";

interface FileGridProps {
  availableStorageClasses?: Record<string, StorageClass>,
  loading: boolean,
  hasMore: boolean,
  loadMoreFailed: boolean,
  onLoadMore: () => void,
  data: FileItem.Item[],
  selectedFiles: Map<string, FileItem.Item>,
  onSelectFiles: (file: FileItem.Item[], checked: boolean) => void,
  // onClickFile: (file: FileItem.Item) => void,
  onDoubleClickFile: (file: FileItem.Item) => void,
  // onAction: (action: OperationName, file: FileItem.Item) => void,
}

const FileGrid: React.FC<FileGridProps> = ({
  loading,
  hasMore,
  loadMoreFailed,
  onLoadMore,
  data,
  selectedFiles,
  onSelectFiles,
  onDoubleClickFile,
}) => {
  const {translate} = useI18n();

  const filesData: FileRowData[] = useMemo(() =>
    data.map(item => ({
        ...item,
        id: item.path.toString(),
        isSelected: selectedFiles.has(item.path.toString()),
      })
    ), [data, selectedFiles]);

  const loadingMore = filesData.length > 0 && loading;

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) {
      return;
    }
    onLoadMore();
  };

  const handleEndReached = () => {
    // use the `loadMoreFailed` to make the behavior as same as `file-table`
    // by `file-table` can only trigger `EndReached` only once if failed.
    if (loadMoreFailed) {
      return;
    }
    handleLoadMore();
  }

  // render
  return (
    <div className="no-selectable file-grid w-100 h-100">
      <AutoResizer>
        {({width, height}) => {
          return (
            <BaseGrid
              height={height}
              width={width}
              itemData={filesData}
              columnWidth={GRID_CELL_WIDTH}
              rowHeight={GRID_CELL_HEIGHT}
              endReachedThreshold={LOAD_MORE_THRESHOLD}
              onEndReached={handleEndReached}
              emptyRender={
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
              overlayRender={
                <OverlayHolder
                  loadingMore={loadingMore}
                  loadMoreFailed={loadMoreFailed}
                  onLoadMoreManually={handleLoadMore}
                />
              }
              cellRender={
                ({
                  data,
                  style,
                }) => {
                  if (!data) {
                    return (<div hidden style={style}/>);
                  }
                  return (
                    <div
                      className={classNames("base-cell p-1", {
                        "bg-primary bg-opacity-10": data.isSelected,
                      })}
                      style={style}
                    >
                      <FileCell
                        data={data}
                        onClick={f => onSelectFiles([f], !f.isSelected)}
                        onDoubleClick={onDoubleClickFile}
                      />
                    </div>
                  )
                }
              }
            />
          );
        }}
      </AutoResizer>
    </div>
  );
};

export default FileGrid;
