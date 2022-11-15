import React, {useMemo} from "react";
import classNames from "classnames";
import AutoResizer from "react-virtualized-auto-sizer";

import StorageClass from "@common/models/storage-class";

import {FileItem} from "@renderer/modules/qiniu-client";

import EmptyHolder from "@renderer/components/empty-holder";
import BaseGrid from "@renderer/components/base-grid";

import {LOAD_MORE_THRESHOLD} from "../const";
import {FileRowData} from "../types";
// import {OperationName} from "../types";
import OverlayHolder from "../overlay-holder";
import FileCell from "./file-cell";
import "./file-grid.scss";

const CELL_WIDTH = 240;
const CELL_HEIGHT = 78;

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

  const handleReachEnd = () => {
    if (!hasMore || loadingMore) {
      return;
    }
    onLoadMore();
  };

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
              columnWidth={CELL_WIDTH}
              rowHeight={CELL_HEIGHT}
              endReachedThreshold={LOAD_MORE_THRESHOLD}
              onEndReached={handleReachEnd}
              emptyRender={<EmptyHolder loading={loading}/>}
              overlayRender={<OverlayHolder loadingMore={loadingMore}/>}
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
