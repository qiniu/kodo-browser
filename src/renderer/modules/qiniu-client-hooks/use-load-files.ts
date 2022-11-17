import {DependencyList, useEffect, useRef, useState} from "react";
import {toast} from "react-hot-toast";

import {BackendMode} from "@common/qiniu";

import StorageClass from "@common/models/storage-class";
import {AkItem, EndpointType} from "@renderer/modules/auth";
import {FileItem, listFiles} from "@renderer/modules/qiniu-client";
import * as LocalLogger from "@renderer/modules/local-logger";

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
}: useLoadFilesProps) {
  async function loadFiles(
    path: string,
    marker?: string,
  ) {
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

    setLoading(true);
    if (!marker) {
      setFiles([]);
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
    const res = await listFiles(
      regionId,
      bucketName,
      path,
      marker,
      opt,
    );

    // if loadPath != currentPath, abort result.
    if (currentAddressPath !== currentAddressRef.current) {
      return;
    }

    if (!marker) {
      setFiles(res.data);
    } else {
      setFiles(files.concat(res.data));
    }
    setListMarker(res.marker);
    setLoading(false);
  }


  const [loading, setLoading] = useState(true);
  const [listMarker, setListMarker] = useState<string | undefined>();
  const [files, setFiles] = useState<FileItem.Item[]>([]);
  const currentAddressRef = useRef(currentAddressPath);

  useEffect(() => {
    currentAddressRef.current = currentAddressPath;
    if (shouldAutoReload && !shouldAutoReload()) {
      setListMarker(undefined);
      setFiles([]);
      setLoading(false);
      return;
    }
    const searchPath = currentAddressPath.slice(`${bucketName}/`.length);
    loadFiles(
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
      listMarker,
      files,
    },
    loadFiles,
  }
}
