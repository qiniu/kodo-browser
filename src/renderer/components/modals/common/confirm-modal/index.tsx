import React, {useState} from "react";
import {Button, Modal, ModalProps} from "react-bootstrap";
import {ButtonVariant} from "react-bootstrap/types";
import {useI18n} from "@renderer/modules/i18n";

interface ConfirmModalProps {
  title: React.ReactNode,
  content: React.ReactNode,
  okText?: string,
  okClassName?: string,
  okVariant?: ButtonVariant,
  cancelText?: string,
  cancelClassName?: string,
  cancelVariant?: ButtonVariant,
  onOk: () => Promise<any> | void,
}

const ConfirmModal: React.FC<ModalProps & ConfirmModalProps> = ({
  title,
  content,
  okText,
  okClassName,
  okVariant = "primary",
  cancelText,
  cancelClassName,
  cancelVariant = "light",
  onOk,
  ...modalProps
}) => {
  const {translate} = useI18n();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleClickOk = () => {
    setIsSubmitting(true);
    const okRes = onOk();
    if (!okRes) {
      modalProps.onHide?.();
      setIsSubmitting(false);
      return;
    }
    okRes
      .then(() => {
        modalProps.onHide?.();
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title>
          {title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {content}
      </Modal.Body>
      <Modal.Footer>
        <Button
          className={okClassName}
          variant={okVariant}
          size="sm"
          disabled={isSubmitting}
          onClick={handleClickOk}
        >
          {okText || translate("common.submit")}
        </Button>
        <Button
          className={cancelClassName}
          variant={cancelVariant}
          size="sm"
          onClick={modalProps.onHide}
        >
          {cancelText || translate("common.cancel")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmModal;
