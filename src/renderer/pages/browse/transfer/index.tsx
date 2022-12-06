import React from "react";

import {CreatedDirectoryReplyMessage, JobCompletedReplyMessage} from "@common/ipc-actions/upload";

import {KodoNavigator, useKodoNavigator} from "@renderer/modules/kodo-address";

import TransferPanel from "@renderer/components/transfer-panel";

interface TransferProps {
  onRefresh: () => void,
}

const Transfer: React.FC<TransferProps> = ({
  onRefresh,
}) => {
  const {bucketName, basePath} = useKodoNavigator();

  const handleUploadJobComplete = (data: JobCompletedReplyMessage["data"]["jobUiData"]) => {
    const baseDir = KodoNavigator.getBaseDir(`${data.to.bucket}/${data.to.key}`);
    if (`${bucketName}/${basePath}` === baseDir) {
      onRefresh();
    }
  };

  const handleCreatedDirectory = (data: CreatedDirectoryReplyMessage["data"]) => {
    const baseDir = KodoNavigator.getBaseDir(`${data.bucket}/${data.directoryKey}`);
    if (`${bucketName}/${basePath}` === baseDir) {
      onRefresh();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        right: 0,
        margin: "0 -1px -1px 0",
      }}
    >
      <TransferPanel
        onUploadJobComplete={handleUploadJobComplete}
        onCreatedDirectory={handleCreatedDirectory}
      />
    </div>
  );
};

export default Transfer;
