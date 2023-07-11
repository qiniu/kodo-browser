import {DependencyList, useEffect, useRef, useState} from "react";
import {toast} from "react-hot-toast";

import StorageClass from "@common/models/storage-class";
import {BackendMode} from "@common/qiniu";

import {AkItem, EndpointType} from "@renderer/modules/auth";
import {FileItem, listFiles, ListFilesOption, ListFilesResult} from "@renderer/modules/qiniu-client";
import * as LocalLogger from "@renderer/modules/local-logger";

// load files generator function
interface LoadFilesBaseResult {
  seriesId: string,
  bucketName: string,
  path: string,
}

type LoadFilesSuccessResult = LoadFilesBaseResult & ListFilesResult & {
  error: null,
};
type LoadFilesFailedResult = LoadFilesBaseResult & {
  error: Error,
};
type LoadFilesResult = LoadFilesSuccessResult | LoadFilesFailedResult;

async function* loadFilesGen(
  seriesId: string,
  regionId: string,
  bucketName: string,
  path: string,
  opt: ListFilesOption,
): AsyncGenerator<LoadFilesResult, LoadFilesResult> {
  let marker: string | undefined = undefined;
  while (true) {
    try {
      const res: ListFilesResult = await listFiles(
        regionId,
        bucketName,
        path,
        marker,
        opt,
      );
      const result = {
        ...res,
        seriesId,
        bucketName,
        path,
        error: null,
      };
      if (!res.marker) {
        return result;
      } else {
        yield result;
        marker = res.marker;
      }
    } catch (err: any) {
      const result = {
        error: err,
        seriesId,
        bucketName,
        path,
      }
      yield result;
    }
  }
}

// react hooks
interface useLoadFilesProps {
  user: AkItem | null,
  currentAddressPath: string,
  regionId?: string,
  bucketName?: string,
  storageClasses?: StorageClass[],
  pageSize?: number,
  shouldAutoReload?: () => boolean,
  autoReloadDeps?: DependencyList,
  preferBackendMode?: BackendMode,
  defaultLoadAll?: boolean,
}

export default function useLoadFiles({
  user,
  currentAddressPath,
  regionId,
  bucketName,
  storageClasses,
  pageSize = 500,
  shouldAutoReload,
  autoReloadDeps = [],
  preferBackendMode,
  defaultLoadAll = false,
}: useLoadFilesProps) {

  const [loading, setLoading] = useState(true);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const [files, setFiles] = useState<FileItem.Item[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const currentAddressRef = useRef(currentAddressPath);
  const loadFileIterator = useRef<ReturnType<typeof loadFilesGen>>();
  const loadSeriesId = useRef(Date.now().toString());

  const getFilesIterator = (
    path: string,
  ) => {
    if (!user) {
      return;
    }

    if (!regionId || !bucketName || !storageClasses) {
      toast.error("hooks listFiles lost required arguments.");
      LocalLogger.error(
        "hooks listFiles lost required arguments,",
        "regionId: ", regionId,
        "bucketName: ", bucketName,
        "storageClasses: ", storageClasses,
      );
      return;
    }

    const opt = {
      id: user.accessKey,
      secret: user.accessSecret,
      isPublicCloud: user.endpointType === EndpointType.Public,
      preferKodoAdapter: preferBackendMode === BackendMode.Kodo,
      preferS3Adapter: preferBackendMode === BackendMode.S3,

      maxKeys: pageSize,
      minKeys: pageSize,
      storageClasses: storageClasses,
    }

    loadSeriesId.current = Date.now().toString();
    return loadFilesGen(
      loadSeriesId.current,
      regionId,
      bucketName,
      path,
      opt,
    );
  };

  const loadMore = async (shouldClear: boolean = false): Promise<boolean> => {
    if (!loadFileIterator.current) {
      return true;
    }
    setLoadMoreFailed(false);
    setLoading(true);
    const {value: res, done} = await loadFileIterator.current.next();
    // abort result by load series not match.
    if (res && res.seriesId !== loadSeriesId.current) {
      return true;
    }
    // abort result by load path not equal current path.
    const [currentBucketName] = currentAddressPath.split("/", 1);
    const currentPath = currentAddressPath.slice(`${currentBucketName}/`.length)
    if (res && `${res.bucketName}/${res.path}` !== `${currentBucketName}/${currentPath}`) {
      return true;
    }
    // abort result by load failed
    if (res && res.error) {
      setLoading(false);
      setLoadMoreFailed(true);
      throw res.error;
    }
    if (res && res.data) {
      if (shouldClear) {
        setFiles(res.data);
      } else {
        setFiles(files => files.concat(res.data));
      }
    }
    setHasMore(!done);
    setLoading(false);
    return done ?? true;
  };

  const reload = async (path: string, loadAll: boolean = defaultLoadAll) => {
    loadFileIterator.current = getFilesIterator(path);
    if (!loadFileIterator.current) {
      return;
    }
    setFiles([]);
    let done = await loadMore(true);
    if (loadAll && !done) {
      while (!done) {
        done = await loadMore();
      }
    }
  };

  useEffect(() => {
    currentAddressRef.current = currentAddressPath;
    if (shouldAutoReload && !shouldAutoReload()) {
      setLoading(false);
      setFiles([]);
      setHasMore(false)
      return;
    }
    const searchPath = currentAddressPath.slice(`${bucketName}/`.length);
    reload(
      searchPath,
    )
      .catch(err => {
        toast.error(err.toString());
        LocalLogger.error(err);
      });
  }, [
    ...autoReloadDeps,
    currentAddressPath,
    regionId,
    bucketName,
  ]);

  return {
    loadFilesState: {
      loading,
      files,
      hasMore,
      loadMoreFailed,
    },
    reload,
    loadMore,
  }
}
