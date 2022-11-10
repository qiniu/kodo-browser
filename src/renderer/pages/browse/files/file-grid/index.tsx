import React, {useMemo} from "react";
import classNames from "classnames";
import AutoResizer from "react-virtualized-auto-sizer";
import {FixedSizeGrid as Grid} from "react-window";

import StorageClass from "@common/models/storage-class";

import {FileItem} from "@renderer/modules/qiniu-client";

import EmptyHolder from "@renderer/components/empty-holder";

import {LOAD_MORE_THRESHOLD} from "../const";
import {FileRowData} from "../types";
// import {OperationName} from "../types";
import OverlayHolder from "../overlay-holder";
import FileCell from "./file-cell";
import "./file-grid.scss";

const CELL_WIDTH = 240;
const CELL_HEIGHT = 78;
const SCROLL_BAR_WIDTH = 20;

interface FileGridProps {
  availableStorageClasses?: Record<string, StorageClass>,
  loading: boolean,
  hasMore: boolean,
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
  onLoadMore,
  data,
  selectedFiles,
  onSelectFiles,
  onDoubleClickFile,
}) => {
  const filesData: FileRowData[] = useMemo(() =>
    data.map(item => ({
        ...item,
        id: item.path.toString(),
        isSelected: selectedFiles.has(item.path.toString()),
      })
    ), [data, selectedFiles]);

  const loadingMore = filesData.length > 0 && loading;

  const handleEndReached = () => {
    if (!hasMore || loading) {
      return;
    }
    onLoadMore();
  };

  return (
    <div className="no-selectable file-grid w-100 h-100">
      <AutoResizer>
        {({width, height}) => {
          const columnCount = Math.floor((width - SCROLL_BAR_WIDTH) / CELL_WIDTH);
          const rowCount = Math.ceil(filesData.length / columnCount);
          return (
            <Grid
              className="base-grid"
              height={height}
              width={width}
              columnWidth={CELL_WIDTH}
              columnCount={columnCount}
              rowHeight={CELL_HEIGHT}
              rowCount={rowCount}
              onScroll={({scrollTop}) => {
                const contentHeight = CELL_HEIGHT * rowCount;
                const heightToReachBottom = contentHeight - (height + scrollTop);
                if (heightToReachBottom < LOAD_MORE_THRESHOLD) {
                  handleEndReached();
                }
              }}
            >
              {
                ({
                  rowIndex,
                  columnIndex,
                  style,
                }) => {
                  const d = filesData[rowIndex * columnCount + columnIndex];
                  if (!d) {
                    return (<div hidden style={style}/>);
                  }
                  return (
                    <div
                      className={classNames("base-cell p-1", {
                        "bg-primary bg-opacity-10": d.isSelected,
                      })}
                      style={style}
                    >
                      <FileCell
                        data={d}
                        onClick={f => onSelectFiles([f], !f.isSelected)}
                        onDoubleClick={onDoubleClickFile}
                      />
                    </div>
                  )
                }
              }
            </Grid>
          );
        }}
      </AutoResizer>
      {
        !filesData.length &&
        <EmptyHolder loading={loading}/>
      }
      {
        loadingMore &&
        <OverlayHolder loadingMore={loadingMore}/>
      }
    </div>
  );
};

export default FileGrid;
