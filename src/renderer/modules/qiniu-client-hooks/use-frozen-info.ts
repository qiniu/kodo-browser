import {useState} from "react";
import {toast} from "react-hot-toast";

import {BackendMode} from "@common/qiniu";

import {getFrozenInfo} from "@renderer/modules/qiniu-client";
import {AkItem, EndpointType} from "@renderer/modules/auth";

export interface FrozenInfo {
  isLoading: boolean,
  status?: "Normal" | "Frozen" | "Unfreezing" | "Unfrozen",
  expiryDate?: number,
}

interface useFrozenInfoProps {
  user: AkItem | null,
  regionId?: string,
  bucketName?: string,
  filePath?: string,
  preferBackendMode?: BackendMode,
}

const useFrozenInfo = ({
  user,
  regionId,
  bucketName,
  filePath,
  preferBackendMode,
}: useFrozenInfoProps) => {
  const [frozenInfo, setFrozenInfo] = useState<FrozenInfo>({
    isLoading: true,
  });

  const fetchFrozenInfo = () => {
    if (!user || !regionId || !bucketName || filePath === undefined) {
      return;
    }

    setFrozenInfo({
      isLoading: true,
    });

    const opt = {
      id: user.accessKey,
      secret: user.accessSecret,
      isPublicCloud: user.endpointType === EndpointType.Public,
      preferKodoAdapter: preferBackendMode === BackendMode.Kodo,
      preferS3Adapter: preferBackendMode === BackendMode.S3,
    };

    getFrozenInfo(
      regionId,
      bucketName,
      filePath,
      opt,
    )
      .then(({status, expiryDate}) => {
        setFrozenInfo({
          isLoading: false,
          status: status,
          expiryDate: expiryDate?.getTime(),
        })
      })
      .catch(err => {
        setFrozenInfo({
          isLoading: false,
        });
        toast.error(err.toString());
      });
  }

  return {
    frozenInfo,
    fetchFrozenInfo,
  };
};

export default useFrozenInfo;
