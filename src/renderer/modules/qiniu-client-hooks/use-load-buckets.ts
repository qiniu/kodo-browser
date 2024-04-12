import {useState} from "react";
import {AkItem} from "@renderer/modules/auth";
import {BucketItem, listAllBuckets} from "@renderer/modules/qiniu-client";

interface LoadBucketsState {
  loading: boolean,
  buckets: BucketItem[],
}

interface UseLoadFilesProps {
  user: AkItem | null,
}

export default function useLoadBuckets({
  user,
}: UseLoadFilesProps) {
  const [loadBucketsState, setLoadBucketsState] = useState<LoadBucketsState>({
    loading: true,
    buckets: [],
  });

  const loadBuckets = async () => {
    if (!user) {
      return;
    }

    const opt = {
      id: user.accessKey,
      secret: user.accessSecret,
      endpointType: user.endpointType,
    };

    setLoadBucketsState(s => ({
      ...s,
      loading: true,
    }));
    try {
      const buckets = await listAllBuckets(opt);
      setLoadBucketsState({
        loading: false,
        buckets,
      });
    } finally {
      setLoadBucketsState(v => ({
        ...v,
        loading: false,
      }));
    }
  };

  return {
    loadBucketsState,
    loadBuckets,
  };
}
