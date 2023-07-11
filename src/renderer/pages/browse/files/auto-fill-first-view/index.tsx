import React, {PropsWithChildren, useEffect} from "react";

interface AutoFillFirstViewProps<T = any> {
  height: number,
  rowData: T[],
  rowHeight: number,
  onLoadMore: () => void,
}

const AutoFillFirstView: React.FC<PropsWithChildren<AutoFillFirstViewProps>> = ({
  height,
  rowData,
  rowHeight,
  onLoadMore,
  children,
}) => {
  useEffect(() => {
    if (rowData.length * rowHeight > height) {
      return;
    }
    onLoadMore();
  }, [height, rowData, rowHeight]);

  return (
    <>
      {children}
    </>
  );
};

export default AutoFillFirstView;
