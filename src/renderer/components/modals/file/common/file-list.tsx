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
        <li>
          <i className="bi bi-folder-fill me-1 text-yellow"/>
          {data.name}
        </li>
      );
    case FileItem.ItemType.File:
      return (
        <li>
          <i className="bi bi-file-earmark me-1"/>
          {data.name}
        </li>
      );
    case FileItem.ItemType.Prefix:
      return (
        <li>
          {data.path.toString()}
        </li>
      );
  }
};

interface FileListProps {
  className?: string,
  data: FileItem.Item[],
  description?: React.ReactNode,
  prefixDescription?: React.ReactNode,
}

const FileList: React.FC<FileListProps> = ({
  className,
  data,
  description,
  prefixDescription,
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
    <div className={className}>
      {
        prefixes?.length > 0 &&
        <div>
          {prefixDescription}
          <ul>
            {
              prefixes.map(fileItem => (
                <FileListItem key={fileItem.path.toString()} data={fileItem}/>
              ))
            }
          </ul>
        </div>
      }
      {
        otherItems?.length > 0 &&
        <div>
          {description}
          <ul>
            {
              otherItems.map(fileItem => (
                <FileListItem key={fileItem.name} data={fileItem}/>
              ))
            }
          </ul>
        </div>
      }
    </div>
  )
}

export default FileList;
