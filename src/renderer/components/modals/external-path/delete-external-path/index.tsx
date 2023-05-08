import React, {useMemo} from "react";
import {Button, Modal, ModalProps} from "react-bootstrap";
import {toast} from "react-hot-toast";

import {Translate, useI18n} from "@renderer/modules/i18n";
import {useAuth} from "@renderer/modules/auth";
import {ExternalPathItem, useKodoExternalPath} from "@renderer/modules/kodo-address";

import {useSubmitModal} from "../../hooks";

interface DeleteExternalPathProps {
  externalPath: ExternalPathItem | null,
  regionName?: string,
  onDeletedExternalPath: () => void,
}

const DeleteExternalPath: React.FC<ModalProps & DeleteExternalPathProps> = ({
  externalPath,
  regionName,
  onDeletedExternalPath,
  ...modalProps
}) => {
  const {translate} = useI18n();
  const {currentUser} = useAuth();

  const {
    externalPathState: {
      kodoExternalPath,
    },
  } = useKodoExternalPath(currentUser);

  // cache operation states prevent props update after modal opened.
  const {
    memoExternalPath,
    memoRegionName,
  } = useMemo(() => {
    return {
      memoExternalPath: externalPath,
      memoRegionName: regionName,
    };
  }, [modalProps.show]);

  const contentI18nData = {
    externalPathUrl: memoExternalPath
      ? (memoExternalPath.protocol + memoExternalPath.path)
      : "",
    regionName: memoRegionName ?? "",
  };

  const {
    state: {
      isSubmitting,
    },
    handleSubmit,
  } = useSubmitModal();

  const handleSubmitDeleteExternalPath = () => {
    if (!currentUser || !kodoExternalPath || !memoExternalPath) {
      return;
    }

    kodoExternalPath.deleteExternalPath(memoExternalPath);
    toast.success("删除成功");
    onDeletedExternalPath();
    modalProps.onHide?.();
  }

  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title className="text-danger">
          <i className="bi bi-trash3-fill me-1"/>
          {translate("modals.deleteExternalPath.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {
          !memoExternalPath
            ? translate("common.noObjectSelected")
            : <div className="text-pre-line">
              <Translate
                data={contentI18nData}
                i18nKey="modals.deleteExternalPath.content"
                slots={{
                  externalPathUrl: v => <code key="pathUrl">{v}</code>,
                  regionName: v => <code key="regionName">{v}</code>,
                }}
              />
            </div>
        }
      </Modal.Body>
      <Modal.Footer>
        {
          !memoExternalPath
            ? null
            : <Button
              variant="danger"
              size="sm"
              disabled={isSubmitting}
              onClick={handleSubmit(handleSubmitDeleteExternalPath)}
            >
              {isSubmitting ? translate("common.submitting") : translate("modals.deleteExternalPath.submit")}
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

export default DeleteExternalPath;
