import React, {useEffect} from "react";
import {Button, Col, Form, Modal, ModalProps, Row} from "react-bootstrap";
import {toast} from "react-hot-toast";
import {SubmitHandler, useFieldArray, useForm} from "react-hook-form";

import {useI18n} from "@renderer/modules/i18n";
import * as LocalLogger from "@renderer/modules/local-logger";
import {Endpoint, privateEndpointPersistence} from "@renderer/modules/qiniu-client";

import RegionInputs from "./region-inputs";

const PrivateCloudSettings: React.FC<ModalProps> = (modalProps) => {
  const {translate} = useI18n();

  const handleSavePrivateCloudSettings: SubmitHandler<Endpoint> = (data) => {
    LocalLogger.info("private cloud saving settings", data);
    const p = new Promise((resolve => {
      setTimeout(() => {
        resolve(data);
      }, 3000);
    }));
    LocalLogger.debug("save private cloud settings", data);
    return toast.promise(p, {
      loading: translate("common.saving"),
      success: translate("common.saved"),
      error: err => `${translate("common.failed")}: ${err}`,
    });
  }

  const {
    handleSubmit,
    control,
    register,
    reset,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<Endpoint>();

  const {
    fields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "regions",
  });

  useEffect(() => {
    reset(privateEndpointPersistence.read());
  }, [modalProps.show])

  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-gear-fill me-1"/>
          {translate("modals.privateCloudSettings.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="scroll-max-vh-60">
        <Button variant="success" size="sm" disabled={isSubmitting} onClick={() => {
          append({identifier: "", label: "", endpoint: ""})
        }}>
          <i className="bi bi-plus-circle-fill me-1"/>
          {translate("modals.privateCloudSettings.appendRegionButton")}
        </Button>
        <Form className="mt-2">
          <fieldset disabled={isSubmitting}>
            <Form.Group as={Row} className="mb-3" controlId="privateCloudSettingUcUrl">
              <Form.Label className="text-end" column sm={4}>
                <span className="text-danger">*</span>{translate("modals.privateCloudSettings.form.ucUrl.label")}
              </Form.Label>
              <Col sm={7}>
                <Form.Control
                  {...register("ucUrl", {required: true})}
                  type="text"
                  placeholder={translate("modals.privateCloudSettings.form.ucUrl.holder")}
                  isInvalid={Boolean(errors.ucUrl)}
                />
                <Form.Control.Feedback type="invalid">
                  {translate("modals.privateCloudSettings.form.ucUrl.feedback.required")}
                </Form.Control.Feedback>
              </Col>
            </Form.Group>
            {
              fields.map((field, index) => (
                <RegionInputs
                  key={field.id}
                  id={field.id}
                  groupNameSuffix={index + 1}
                  onRemove={() => {
                    remove(index)
                  }}
                  regionIdentifierControlProps={{
                    ...register(
                      `regions.${index}.identifier`,
                      {
                        required: true,
                      },
                    ),
                    isInvalid: Boolean(errors?.regions?.[index]?.identifier),
                  }}
                  regionNameControlProps={register(`regions.${index}.label`)}
                  regionEndpointControlProps={{
                    ...register(
                      `regions.${index}.endpoint`,
                      {
                        required: true,
                      },
                    ),
                    isInvalid: Boolean(errors?.regions?.[index]?.endpoint),
                  }}
                />
              ))
            }
          </fieldset>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="primary"
          size="sm"
          disabled={isSubmitting}
          onClick={handleSubmit(handleSavePrivateCloudSettings)}
        >
          {isSubmitting ? translate("common.saving") : translate("common.save")}
        </Button>
        <Button
          variant="light"
          size="sm"
          onClick={modalProps.onHide}
        >
          {translate("common.cancel")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default PrivateCloudSettings;
