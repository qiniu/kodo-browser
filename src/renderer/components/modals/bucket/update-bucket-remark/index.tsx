import React, {Fragment, useEffect, useMemo} from "react";
import classNames from "classnames";
import {Button, Form, Modal, ModalProps} from "react-bootstrap";
import {toast} from "react-hot-toast";
import {SubmitHandler, useForm} from "react-hook-form";

import {useI18n} from "@renderer/modules/i18n";
import {useAuth} from "@renderer/modules/auth";
import {BucketItem, updateBucketRemark} from "@renderer/modules/qiniu-client";

interface UpdateBucketRemarkProps {
  bucketItem?: BucketItem | null,
  onUpdatedBucketRemark: (bucket: BucketItem) => void,
}

interface UpdateBucketRemarkFormData {
  remark: string,
}

const REMARK_MAX_LENGTH = 100;

const UpdateBucketRemark: React.FC<ModalProps & UpdateBucketRemarkProps> = ({
  bucketItem,
  onUpdatedBucketRemark,
  ...modalProps
}) => {
  const {translate} = useI18n();
  const {currentUser} = useAuth();

  // cache operation states prevent props update after modal opened.
  const {
    memoBucketItem,
  } = useMemo(() => {
    return {
      memoBucketItem: bucketItem,
    };
  }, [modalProps.show]);

  const {
    handleSubmit,
    register,
    reset,
    watch,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<UpdateBucketRemarkFormData>({
    mode: "onChange",
    defaultValues: {
      remark: memoBucketItem?.remark ?? "",
    },
  })

  const handleSubmitUpdateBucketRemark: SubmitHandler<UpdateBucketRemarkFormData> = (data) => {
    if (!memoBucketItem || !currentUser) {
      return;
    }

    const opt = {
      id: currentUser.accessKey,
      secret: currentUser.accessSecret,
      endpointType: currentUser.endpointType,
      preferKodoAdapter: true, // S3 hasn't the remark API
    };
    const p = updateBucketRemark(
      memoBucketItem.name,
      data.remark,
      opt,
    );
    p.then(() => {
      onUpdatedBucketRemark({
        ...memoBucketItem,
        remark: data.remark,
      });
      modalProps.onHide?.();
    });
    return toast.promise(p, {
      loading: translate("common.submitting"),
      success: translate("common.submitted"),
      error: err => `${translate("common.failed")}: ${err}`,
    });
  }

  useEffect(() => {
    if (modalProps.show) {
      reset({
        remark: memoBucketItem?.remark ?? "",
      });
    } else {
    }
  }, [modalProps.show]);

  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-pencil me-1"/>
          {translate("modals.updateBucketRemark.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {
          !memoBucketItem
            ? translate("common.noObjectSelected")
            : <>
              <Form
                className="mx-5"
                onSubmit={handleSubmit(handleSubmitUpdateBucketRemark)}
              >
                <fieldset
                  className="grid-auto grid-form label-col-1"
                  disabled={isSubmitting}
                >
                  <Form.Group as={Fragment} controlId="bucketName">
                    <Form.Label className="text-end">
                      {translate("modals.updateBucketRemark.form.bucketName.label")}
                    </Form.Label>
                    <div>
                      <Form.Control
                        plaintext
                        readOnly
                        defaultValue={memoBucketItem.name}
                      />
                    </div>
                  </Form.Group>
                  <Form.Group as={Fragment} controlId="bucketName">
                    <Form.Label className="text-end">
                      {translate("modals.updateBucketRemark.form.bucketRemark.label")}
                    </Form.Label>
                    <div>
                      <Form.Control
                        {...register("remark", {
                          maxLength: REMARK_MAX_LENGTH,
                        })}
                        as="textarea"
                        rows={3}
                        style={{
                          resize: 'none',
                        }}
                        isInvalid={Boolean(errors.remark)}
                        defaultValue={memoBucketItem.remark}
                        placeholder={translate("modals.updateBucketRemark.form.bucketRemark.holder")}
                      />
                      <Form.Text
                        className={classNames(
                          "d-block",
                          "text-end",
                          {
                            "text-danger": Boolean(errors.remark)
                          }
                        )}
                      >
                        {watch("remark").length}/{REMARK_MAX_LENGTH}
                      </Form.Text>
                    </div>
                  </Form.Group>
                </fieldset>
              </Form>
            </>
        }
      </Modal.Body>
      <Modal.Footer>
        {
          !memoBucketItem
            ? null
            : <Button
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              onClick={handleSubmit(handleSubmitUpdateBucketRemark)}
            >
              {isSubmitting ? translate("common.submitting") : translate("common.submit")}
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

export default UpdateBucketRemark;
