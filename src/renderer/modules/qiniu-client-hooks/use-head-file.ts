import {useState} from "react";
import {toast} from "react-hot-toast";
import {ObjectInfo} from "kodo-s3-adapter-sdk/dist/adapter";

import StorageClass from "@common/models/storage-class";

import {AkItem, EndpointType} from "@renderer/modules/auth";
import {headFile} from "@renderer/modules/qiniu-client";

interface HeadFileState {
  isLoading: boolean,
  fileInfo?: ObjectInfo,
}

interface useHeadFileProps {
  user: AkItem | null,
  regionId?: string,
  bucketName?: string,
  filePath?: string,
  storageClasses?: StorageClass[],
}

const useHeadFile = ({
  user,
  regionId,
  bucketName,
  filePath,
  storageClasses,
}: useHeadFileProps) => {
  const [headFileState, setHeadFileState] = useState<HeadFileState>({
    isLoading: true,
  });

  const fetchFileInfo = () => {
    if (!user || !regionId || !bucketName || !filePath || !storageClasses) {
      return;
    }

    setHeadFileState({
      isLoading: true,
    });

    const opt = {
      id: user.accessKey,
      secret: user.accessSecret,
      isPublicCloud: user.endpointType === EndpointType.Public,
      storageClasses: storageClasses,
    };

    headFile(
      regionId,
      bucketName,
      filePath,
      opt,
    )
      .then(data => {
        setHeadFileState({
          isLoading: false,
          fileInfo: data,
        });
      })
      .catch(err => {
        setHeadFileState({
          isLoading: false,
        });
        toast.error(err.toString());
      });
  };

  return {
    headFileState,
    fetchFileInfo,
  };
};

export default useHeadFile;
