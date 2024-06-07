import React from "react";
import {Region} from "kodo-s3-adapter-sdk";

import {BackendMode} from "@common/qiniu";

import {useAuth} from "@renderer/modules/auth";
import {Provider as FileOperationProvider} from "@renderer/modules/file-operation";
import {BucketItem} from "@renderer/modules/qiniu-client";

import Files from "../browse/files";

interface ContentsProps {
  toggleRefresh?: boolean,
}

const Contents: React.FC<ContentsProps> = ({
  toggleRefresh
}) => {
  const {shareSession} = useAuth();

  if (!shareSession) {
    return (
      <>
        no share session
      </>
    );
  }

  const bucket: BucketItem = {
    id: shareSession.bucketId,
    name: shareSession.bucketName,
    // can't get create data of a share path.
    createDate: new Date(NaN),
    regionId: shareSession.regionS3Id,
    preferBackendMode: BackendMode.S3,
    grantedPermission: shareSession.permission === "READWRITE" ? "readwrite" : "readonly",
  }
  const region: Region = new Region(
    "",
    shareSession.regionS3Id,
  );
  region.s3Urls = [shareSession.endpoint]

  return (
    <FileOperationProvider
      bucketGrantedPermission={shareSession.permission !== "READWRITE" ? "readonly" : "readwrite"}
      bucketPreferBackendMode={BackendMode.S3}
    >
      <div
        style={{
          position: "relative",
          height: "calc(100vh - 6rem)",
          ["--bs-body-font-size" as any]: "0.875rem",
        }}
        className="d-flex flex-column"
      >
        <Files
          toggleRefresh={toggleRefresh}
          bucket={bucket}
          region={region}
        />
      </div>
    </FileOperationProvider>
  );
};

export default Contents;
