import React, {useMemo} from "react"
import {Button, Modal, ModalProps, Spinner} from "react-bootstrap";
import {toast} from "react-hot-toast";
import {SubmitHandler, useForm} from "react-hook-form";

import StorageClass from "@common/models/storage-class";
import {BackendMode} from "@common/qiniu";

import {useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {FileItem, setStorageClass} from "@/renderer/modules/qiniu-client";
import {useFileOperation} from "@renderer/modules/file-operation";

import {ChangeStorageClassForm, ChangeStorageClassFormData} from "@renderer/components/forms";

import {OperationDoneRecallFn} from "../types";

interface ChangeFileStorageClassProps {
  regionId: string,
  bucketName: string,
  basePath: string,
  fileItem: FileItem.File | null,
  storageClasses: StorageClass[],
  onChangedFilesStorageClass: OperationDoneRecallFn,
}

const ChangeFileStorageClass: React.FC<ModalProps & ChangeFileStorageClassProps> = (props) => {
  const {
    regionId,
    bucketName,
    basePath,
    fileItem,
    storageClasses,
    onChangedFilesStorageClass,
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
    memoBasePath,
    memoStorageClasses,
  } = useMemo(() => ({
    memoFileItem: fileItem,
    memoRegionId: regionId,
    memoBucketName: bucketName,
    memoBasePath: basePath,
    memoStorageClasses: storageClasses,
  }), [modalProps.show]);

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

  const handleSubmitChangeFileStorageClass: SubmitHandler<ChangeStorageClassFormData> = (data) => {
    if (!memoFileItem || !currentUser) {
      return;
    }

    const opt = {
      id: currentUser.accessKey,
      secret: currentUser.accessSecret,
      isPublicCloud: currentUser.endpointType === EndpointType.Public,
      storageClasses: memoStorageClasses,
      preferKodoAdapter: preferBackendMode === BackendMode.Kodo,
      preferS3Adapter: preferBackendMode === BackendMode.S3,
    };

    const p = setStorageClass(
      memoRegionId,
      memoBucketName,
      memoFileItem.path.toString(),
      data.storageClassKodoName,
      opt,
    );

    p.then(() => {
      onChangedFilesStorageClass({originBasePath: memoBasePath});
    })

    return toast.promise(p, {
      loading: translate("common.submitting"),
      success: translate("common.submitted"),
      error: err => `${translate("common.failed")}: ${err}`,
    });
  };

  // reset states when open/close modal
  // useEffect(() => {
  //   if (modalProps.show) {
  //   } else {
  //   }
  // }, [modalProps.show]);

  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-arrow-left-right me-1"/>
          {translate("modals.changeFileStorageClass.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {
          !memoFileItem
            ? <div>
              {translate("common.noOperationalObject")}
            </div>
            : <ChangeStorageClassForm
              fileName={memoFileItem.name}
              formController={changeStorageClassFormController}
              storageClasses={memoStorageClasses}
              defaultStorageClassKodoName={memoFileItem.storageClass}
              onSubmit={handleSubmitChangeFileStorageClass}
            />
        }
      </Modal.Body>
      <Modal.Footer>
        {
          !memoFileItem || isSubmitSuccessful
            ? null
            : <Button
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              onClick={handleSubmit(handleSubmitChangeFileStorageClass)}
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
  );
};

export default ChangeFileStorageClass;
