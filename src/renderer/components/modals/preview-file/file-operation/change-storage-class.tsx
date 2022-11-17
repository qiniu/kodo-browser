import React, {PropsWithChildren, useEffect} from "react";
import {Button, Spinner} from "react-bootstrap";
import {toast} from "react-hot-toast";
import {SubmitHandler, useForm} from "react-hook-form";

import StorageClass from "@common/models/storage-class";
import {BackendMode} from "@common/qiniu";

import {useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {FileItem, setStorageClass} from "@renderer/modules/qiniu-client";
import {useFileOperation} from "@renderer/modules/file-operation";
import useHeadFile from "@renderer/modules/qiniu-client-hooks/use-head-file";

import LoadingHolder from "@renderer/components/loading-holder";

import {ChangeStorageClassForm, ChangeStorageClassFormData} from "@renderer/components/forms";
import {OperationDoneRecallFn} from "../../file/types";

interface ChangeStorageClassProps {
  regionId: string,
  bucketName: string,
  basePath: string,
  fileItem: FileItem.File,
  storageClasses: StorageClass[],
  submitButtonPortal?: React.FC<PropsWithChildren>,
  onChangedFileStorageClass: OperationDoneRecallFn,
}

const ChangeStorageClass: React.FC<ChangeStorageClassProps> = ({
  regionId,
  bucketName,
  basePath,
  fileItem,
  storageClasses,
  submitButtonPortal: SubmitButtonPortal,
  onChangedFileStorageClass,
}) => {
  const {translate} = useI18n();
  const {currentUser} = useAuth();
  const {bucketPreferBackendMode: preferBackendMode} = useFileOperation();

  // fetch file info
  const {
    headFileState,
    fetchFileInfo,
  } = useHeadFile({
    user: currentUser,
    regionId,
    bucketName,
    filePath: fileItem.path.toString(),
    storageClasses,
    preferBackendMode,
  });

  useEffect(() => {
    fetchFileInfo();
  }, []);
  // ---

  // form to change file storage class
  const changeStorageClassFormController = useForm<ChangeStorageClassFormData>({
    mode: "onChange",
    defaultValues: {
      storageClassKodoName: storageClasses[0]?.kodoName ?? "Standard",
    },
  });

  const {
    handleSubmit,
    formState: {
      isSubmitting,
      isSubmitSuccessful,
    },
  } = changeStorageClassFormController;

  const handleSubmitChangeStorageClass: SubmitHandler<ChangeStorageClassFormData> = (data) => {
    if (!fileItem || !currentUser) {
      return;
    }

    const opt = {
      id: currentUser.accessKey,
      secret: currentUser.accessSecret,
      isPublicCloud: currentUser.endpointType === EndpointType.Public,
      storageClasses,
      preferKodoAdapter: preferBackendMode === BackendMode.Kodo,
      preferS3Adapter: preferBackendMode === BackendMode.S3,
    };

    const p = setStorageClass(
      regionId,
      bucketName,
      fileItem.path.toString(),
      data.storageClassKodoName,
      opt,
    );

    p.then(() => {
      onChangedFileStorageClass({originBasePath: basePath});
    });

    return toast.promise(p, {
      loading: translate("common.submitting"),
      success: translate("common.submitted"),
      error: err => `${translate("common.failed")}: ${err}`,
    });
  };

  if (headFileState.isLoading){
    return (
      <LoadingHolder/>
    );
  }

  return (
    <div className="p-4">
      <div>{headFileState.fileInfo?.storageClassName}</div>
      <ChangeStorageClassForm
        formController={changeStorageClassFormController}
        storageClasses={storageClasses}
        defaultStorageClassKodoName={headFileState.fileInfo?.storageClass}
        onSubmit={handleSubmitChangeStorageClass}
      />
      {
        !SubmitButtonPortal || isSubmitSuccessful
          ? null
          : <SubmitButtonPortal>
            <Button
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              onClick={handleSubmit(handleSubmitChangeStorageClass)}
            >
              {
                isSubmitting
                  ? <>
                    <Spinner className="me-1" animation="border" size="sm"/>
                    {translate("common.submitting")}
                  </>
                  : translate("common.submit")
              }
            </Button>
          </SubmitButtonPortal>
      }
    </div>
  );
};

export default ChangeStorageClass;
