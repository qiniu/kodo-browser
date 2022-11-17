import React, {useEffect, useMemo,} from "react"
import {Button, Modal, ModalProps, Spinner} from "react-bootstrap";
import {toast} from "react-hot-toast";
import {SubmitHandler, useForm} from "react-hook-form";

import {BackendMode} from "@common/qiniu";

import {useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {FileItem, restoreFile} from "@renderer/modules/qiniu-client";
import useFrozenInfo from "@renderer/modules/qiniu-client-hooks/use-frozen-info";
import {useFileOperation} from "@renderer/modules/file-operation";

import {RestoreForm, RestoreFormData} from "@renderer/components/forms";

interface RestoreFileProps {
  regionId: string,
  bucketName: string,
  fileItem: FileItem.File | null,
}

const RestoreFile: React.FC<ModalProps & RestoreFileProps> = (props) => {
  const {
    regionId,
    bucketName,
    fileItem,
    ...modalProps
  } = props;

  const {translate} = useI18n();
  const {currentUser} = useAuth();
  const {bucketPreferBackendMode: preferBackendMode} = useFileOperation();

  // cache operation states prevent props update after modal opened.
  const {
    memoFileItem,
    memoRegionId,
    memoBucketName,
  } = useMemo(() => ({
    memoFileItem: fileItem,
    memoRegionId: regionId,
    memoBucketName: bucketName,
  }), [modalProps.show]);

  // frozen info
  const {
    frozenInfo,
    fetchFrozenInfo,
  } = useFrozenInfo({
    user: currentUser,
    regionId: memoRegionId,
    bucketName: memoBucketName,
    filePath: memoFileItem?.path.toString(),
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
    reset,
    formState: {
      isSubmitting,
      isSubmitSuccessful,
    },
  } = restoreFormController;

  const handleSubmitRestoreFile: SubmitHandler<RestoreFormData> = (data) => {
    if (!memoFileItem || !currentUser) {
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
      memoRegionId,
      memoBucketName,
      memoFileItem.path.toString(),
      data.days,
      opt,
    );

    p.then(() => {
      modalProps.onHide?.();
    });

    return toast.promise(p, {
      loading: translate("common.submitting"),
      success: translate("common.submitted"),
      error: err => `${translate("common.failed")}: ${err}`,
    });
  };

  // reset states when open/close modal
  useEffect(() => {
    if (modalProps.show) {
      reset({
        days: 1,
      });
      fetchFrozenInfo();
    } else {
    }
  }, [modalProps.show]);

  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-fire me-1"/>
          {translate("modals.restoreFile.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {
          !memoFileItem
            ? <div>
              {translate("common.noOperationalObject")}
            </div>
            : <RestoreForm
              fileName={memoFileItem.name}
              frozenInfo={frozenInfo}
              formController={restoreFormController}
              onSubmit={handleSubmitRestoreFile}
            />
        }
      </Modal.Body>
      <Modal.Footer>
        {
          !memoFileItem || isSubmitSuccessful || frozenInfo.status !== "Frozen"
            ? null
            : <Button
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              onClick={handleSubmit(handleSubmitRestoreFile)}
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
        }
        <Button
          variant="light"
          size="sm"
          onClick={modalProps.onHide}
        >
          {translate("common.close")}
        </Button>
      </Modal.Footer>
    </Modal>
  )
};

export default RestoreFile;
