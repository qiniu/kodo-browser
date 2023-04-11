import React, {PropsWithChildren, useEffect} from "react";
import {Button} from "react-bootstrap";
import {toast} from "react-hot-toast";
import {SubmitHandler, useForm} from "react-hook-form";

import {BackendMode} from "@common/qiniu";

import {useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {restoreFile} from "@renderer/modules/qiniu-client";
import useFrozenInfo from "@renderer/modules/qiniu-client-hooks/use-frozen-info";
import {useFileOperation} from "@renderer/modules/file-operation";

import LoadingHolder from "@renderer/components/loading-holder";
import {RestoreForm, RestoreFormData} from "@renderer/components/forms";

interface FileArchivedProps {
  regionId: string,
  bucketName: string,
  filePath: string,
}

const FileArchived: React.FC<PropsWithChildren<FileArchivedProps>> = (props) => {
  const {
    regionId,
    bucketName,
    filePath,
    children,
  } = props;

  const {translate} = useI18n();
  const {currentUser} = useAuth();
  const {bucketPreferBackendMode: preferBackendMode} = useFileOperation();

  // frozen info
  const {
    frozenInfo,
    fetchFrozenInfo,
  } = useFrozenInfo({
    user: currentUser,
    regionId: regionId,
    bucketName: bucketName,
    filePath: filePath,
    preferBackendMode,
  });

  // restore form
  const restoreFormController = useForm<RestoreFormData>({
    mode: "onChange",
    defaultValues: {
      days: 1,
    },
  });

  const {
    handleSubmit,
  } = restoreFormController;

  const handleSubmitRestoreFile: SubmitHandler<RestoreFormData> = (data) => {
    if (!currentUser || filePath === undefined) {
      return;
    }

    const opt = {
      id: currentUser.accessKey,
      secret: currentUser.accessSecret,
      isPublicCloud: currentUser.endpointType === EndpointType.Public,
      preferKodoAdapter: preferBackendMode === BackendMode.Kodo,
      preferS3Adapter: preferBackendMode === BackendMode.S3,
    };

    const p = restoreFile(
      regionId,
      bucketName,
      filePath,
      data.days,
      opt,
    );

    p.then(() => {
      fetchFrozenInfo();
    });

    return toast.promise(p, {
      loading: translate("common.submitting"),
      success: translate("common.submitted"),
      error: err => `${translate("common.failed")}: ${err}`,
    });
  };

  // effect
  useEffect(() => {
    fetchFrozenInfo();
    restoreFormController.reset({
      days: 1,
    });
  }, [regionId, bucketName, filePath]);

  // render
  if (frozenInfo.isLoading) {
    return (
      <LoadingHolder/>
    );
  }

  if (!(frozenInfo.status === "Normal" || frozenInfo.status === "Unfrozen")) {
    return (
      <div className="d-flex flex-column align-items-center text-bg-danger text-body bg-opacity-10 p-4">
        {
          frozenInfo.status === "Frozen"
            ? <div className="mb-3">
              {frozenInfo.status === "Frozen" && translate("modals.preview.preCheck.archived.description")}
            </div>
            : null
        }
        <div className="mnw-50">
          <RestoreForm
            frozenInfo={frozenInfo}
            formController={restoreFormController}
            onSubmit={handleSubmitRestoreFile}
          />
        </div>
        {
          frozenInfo.status === "Frozen"
            ? <Button
              variant="primary"
              onClick={handleSubmit(handleSubmitRestoreFile)}
            >
              {translate("modals.preview.preCheck.archived.restore")}
            </Button>
            : null
        }
      </div>
    );
  }

  return (
    <>
      {children}
    </>
  );
};

export default FileArchived;
