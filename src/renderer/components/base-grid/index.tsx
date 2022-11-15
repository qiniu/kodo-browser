import React, {CSSProperties, useEffect, useRef} from "react";
import {FixedSizeGrid, FixedSizeGridProps} from "react-window";

const SCROLL_BAR_WIDTH = 20;
const DEFAULT_REACH_END_THRESHOLD = 0;

type CallOrReturn<T, P = any[]> = T | (P extends any[] ? (...p: P) => T : (p: P) => T);

interface CellRenderProps<T = any> {
  style: CSSProperties,
  itemIndex: number,
  data: T | null,
  isScrolling?: boolean,
}

type BaseGridProps<T> =
  Omit<FixedSizeGridProps<T[]>, "columnCount" | "rowCount" | "itemData" | "children">
  & {
  itemData: T[],
  cellRender: CallOrReturn<React.ReactElement, CellRenderProps<T>>,
  emptyRender?: CallOrReturn<React.ReactNode>,
  overlayRender?: CallOrReturn<React.ReactNode>,
  endReachedThreshold?: number,
  onEndReached?: () => void,
};

function BaseGrid<T>(props: BaseGridProps<T>) {
  const columnCount = Math.floor((props.width - SCROLL_BAR_WIDTH) / props.columnWidth);
  const rowCount = Math.ceil(props.itemData.length / columnCount);

  // infinity load more
  const _scrollTop = useRef(0);

  const handleMayReachEnd = () => {
    const contentHeight = props.rowHeight * rowCount;
    const heightToReachBottom = contentHeight - (props.height + _scrollTop.current);
    if (heightToReachBottom < (props.endReachedThreshold ?? DEFAULT_REACH_END_THRESHOLD)) {
      props.onEndReached?.();
    }
  };

  useEffect(() => {
    if (!props.itemData.length) {
      return;
    }
    handleMayReachEnd();
  }, [props.width, props.height, props.itemData.length]);

  return (
    <div
      className={["base-grid", props.className].join(" ")}
      style={{position: "relative", width: props.width, height: props.height}}
    >
      <FixedSizeGrid
        {...props}
        columnCount={columnCount}
        rowCount={rowCount}
        onScroll={(...args) => {
          const [{scrollTop}] = args;
          _scrollTop.current = scrollTop;
          handleMayReachEnd();
          props.onScroll?.(...args);
        }}
      >
        {({
          rowIndex,
          columnIndex,
          style,
          isScrolling,
        }) => {
          const i = rowIndex * columnCount + columnIndex;
          if (typeof props.cellRender === "function") {
            return props.cellRender({
              data: props.itemData[i] ?? null,
              itemIndex: i,
              style,
              isScrolling,
            });
          } else {
            return props.cellRender;
          }
        }}
      </FixedSizeGrid>
      {
        (() => {
          if (!props.itemData.length && props.emptyRender) {
            if (typeof props.emptyRender === "function") {
              return props.emptyRender();
            } else {
              return props.emptyRender;
            }
          }
          return null;
        })()
      }
      {
        (() => {
          if (props.overlayRender) {
            if (typeof props.overlayRender === "function") {
              return props.overlayRender();
            } else {
              return props.overlayRender;
            }
          }
          return null;
        })()
      }
    </div>
  );
}

export default BaseGrid;
