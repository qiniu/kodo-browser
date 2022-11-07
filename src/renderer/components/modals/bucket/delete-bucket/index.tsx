import React, {useMemo} from "react";
import {Button, Modal, ModalProps} from "react-bootstrap";
import {toast} from "react-hot-toast";

import {Translate, useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {deleteBucket} from "@renderer/modules/qiniu-client";

import {useSubmitModal} from "../../hooks";

interface DeleteBucketProps {
  regionId: string,
  bucketName: string,
  onDeletedBucket: () => void,
}

const DeleteBucket: React.FC<ModalProps & DeleteBucketProps> = ({
  regionId,
  bucketName,
  onDeletedBucket,
  ...modalProps
}) => {
  const {translate} = useI18n();
  const {currentUser} = useAuth();

  // cache operation states prevent props update after modal opened.
  const {
    memoRegionId,
    memoBucketName,
  } = useMemo(() => {
    return {
      memoRegionId: regionId,
      memoBucketName: bucketName,
    };
  }, [modalProps.show]);

  const contentI18nData = {
    bucketName: memoBucketName,
  };

  const {
    state: {
      isSubmitting,
    },
    handleSubmit,
  } = useSubmitModal();

  const handleSubmitDeleteBucket = () => {
    if (!currentUser) {
      return;
    }

    const opt = {
      id: currentUser.accessKey,
      secret: currentUser.accessSecret,
      isPublicCloud: currentUser.endpointType === EndpointType.Public,
    };
    const p = deleteBucket(
      memoRegionId,
      memoBucketName,
      opt,
    );
    p.then(() => {
      onDeletedBucket();
      modalProps.onHide?.();
    });
    return toast.promise(p, {
      loading: translate("common.submitting"),
      success: translate("common.submitted"),
      error: err => `${translate("common.failed")}: ${err}`,
    });
  }

  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title className="text-danger">
          <i className="bi bi-trash3-fill me-1"/>
          {translate("modals.deleteBucket.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {
          !memoBucketName || !memoRegionId
            ? translate("common.noOperationalObject")
            : <Translate
              data={contentI18nData}
              i18nKey="modals.deleteBucket.content"
              slots={{
                bucketName: v => <code key="bucketName">{v}</code>,
              }}
            />
        }
      </Modal.Body>
      <Modal.Footer>
        {
          !memoBucketName || !memoRegionId
            ? null
            : <Button
              variant="danger"
              size="sm"
              disabled={isSubmitting}
              onClick={handleSubmit(handleSubmitDeleteBucket)}
            >
              {isSubmitting ? translate("common.submitting") : translate("modals.deleteBucket.submit")}
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

export default DeleteBucket;
