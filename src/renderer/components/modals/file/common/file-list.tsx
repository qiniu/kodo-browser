import React from "react";

import {FileItem} from "@renderer/modules/qiniu-client";

interface FileListItemProps {
  data: FileItem.Item,
}

const FileListItem: React.FC<FileListItemProps> = ({
  data,
}) => {
  switch (data.itemType) {
    case FileItem.ItemType.Directory:
      return (
        <li key={data.path.toString()}>
          <i className="bi bi-folder-fill me-1 text-yellow"/>
          {data.name}
        </li>
      );
    case FileItem.ItemType.File:
      return (
        <li key={data.path.toString()}>
          <i className="bi bi-file-earmark me-1"/>
          {data.name}
        </li>
      );
    case FileItem.ItemType.Prefix:
      let path = data.path.toString() + "*";
      if (path.length > 50) {
        path = path.slice(0, 25) + "..." + path.slice(-25);
      }
      return (
        <li key={data.path.toString()}>
          <i className="bi bi-asterisk me-1"/>
          {path}
        </li>
      );
  }
};

interface FileListProps {
  className: string,
  data: FileItem.Item[],
}

const FileList: React.FC<FileListProps> = ({
  className,
  data,
}) => {
  const prefixes: FileItem.Item[] = data.filter(FileItem.isItemPrefix);
  const prefixPaths = prefixes.map(p => p.path.toString());
  const otherItems = data.filter(i =>
    !FileItem.isItemPrefix(i) &&
    !prefixPaths.some(p =>
      i.path.toString().startsWith(p)
    )
  );

  return (
    <ul className={className}>
      {
        prefixes.concat(otherItems).map(fileItem => (
          <FileListItem key={fileItem.path.toString()} data={fileItem}/>
        ))
      }
    </ul>
  )
}

export default FileList;
