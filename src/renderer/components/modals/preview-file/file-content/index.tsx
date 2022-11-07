import React, {PropsWithChildren, useMemo, useState} from "react";
import {Domain} from "kodo-s3-adapter-sdk/dist/adapter";

import {FileItem} from "@renderer/modules/qiniu-client";

import FileTooLarge from "../precheck/file-too-large";
import PictureContent from "./picture-content";
import OthersContent from "./others-content";
import AudioContent from "./audio-content";
import VideoContent from "./video-content";
import CodeContent from "./code-content";

interface FileContentProps {
  regionId: string,
  bucketName: string,
  fileItem: FileItem.File,
  fileTypeInfo?: FileItem.FileTypeInfo
  domain?: Domain
  portal?: React.FC<PropsWithChildren>,
}

const FileContent: React.FC<PropsWithChildren<FileContentProps>> = ({
  regionId,
  bucketName,
  fileItem,
  fileTypeInfo,
  domain,
  portal,
}) => {
  const fileType = useMemo(
    () => fileTypeInfo ?? FileItem.getFileType(fileItem),
    [fileItem],
  );

  const [openType, setOpenType] = useState(fileType.type);

  // render
  switch (openType) {
    // case FileItem.FileExtensionType.Folder:
    //   return ();
    case FileItem.FileExtensionType.Picture: {
      return (
        <FileTooLarge
          fileSize={fileItem.size}
        >
          <PictureContent
            regionId={regionId}
            bucketName={bucketName}
            filePath={fileItem.path.toString()}
            domain={domain}
          />
        </FileTooLarge>
      );
    }
    // case FileItem.FileExtensionType.Document:
    //   return ();
    case FileItem.FileExtensionType.Video:
      return (
        <VideoContent
          regionId={regionId}
          bucketName={bucketName}
          filePath={fileItem.path.toString()}
          fileExt={fileType.ext[0]}
          domain={domain}
        />
      );
    case FileItem.FileExtensionType.Audio: {
      return (
        <AudioContent
          regionId={regionId}
          bucketName={bucketName}
          filePath={fileItem.path.toString()}
          domain={domain}
        />
      );
    }
    case FileItem.FileExtensionType.Code:
      return (
        <CodeContent
          regionId={regionId}
          bucketName={bucketName}
          filePath={fileItem.path.toString()}
          domain={domain}
          portal={portal}
        />
      );
  }
  return (
    <FileTooLarge
      fileSize={fileItem.size}
      canForcePreview={false}
    >
      <OthersContent
        onOpenAs={setOpenType}
      />
    </FileTooLarge>
  )
};

export default FileContent;
