import React, {useCallback, useEffect, useState} from "react";
import {Button, Col, Form, Modal, ModalProps, Row} from "react-bootstrap";
import {toast} from "react-hot-toast";
import {SubmitHandler, useFieldArray, useForm} from "react-hook-form";
import lodash from "lodash";

import {useI18n} from "@renderer/modules/i18n";
import * as LocalLogger from "@renderer/modules/local-logger";
import {Endpoint, isQueryRegionAPIAvailable, privateEndpointPersistence} from "@renderer/modules/qiniu-client";

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
    getValues,
    setValue,
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
  }, [modalProps.show]);

  // check query region available
  // inheritance from old code.
  // seems useless,
  // because Region.query only be used in kodo,
  // but private cloud only s3.
  const [debouncedUcUrl, setDebouncedUcUrl] = useState<string>("");
  const handleChangeUcUrlDebounced = useCallback(lodash.debounce((v: string) => {
    setDebouncedUcUrl(v);
  }, 500), []);
  const [isQueryApiAvailable, setIsQueryApiAvailable] = useState<boolean>(false);
  useEffect(() => {
    if (errors.ucUrl) {
      return;
    }
    isQueryRegionAPIAvailable(debouncedUcUrl)
      .then(available => {
        setIsQueryApiAvailable(available);
        if (!available && !getValues("regions").length) {
          setValue("regions", [{
            identifier: "",
            label: "",
            endpoint: "",
          }]);
        }
      });
  }, [debouncedUcUrl])


  // render
  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-gear-fill me-1"/>
          {translate("modals.privateCloudSettings.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="scroll-max-vh-60 p-0">
        <Form>
          <fieldset disabled={isSubmitting}>
            <div className="sticky-top bg-body p-3">
              <Button variant="success" size="sm" disabled={isSubmitting} onClick={() => {
                append({identifier: "", label: "", endpoint: ""})
              }}>
                <i className="bi bi-plus-circle-fill me-1"/>
                {translate("modals.privateCloudSettings.appendRegionButton")}
              </Button>
              <Form.Group as={Row} className="mb-3" controlId="privateCloudSettingUcUrl">
                <Form.Label className="text-end" column sm={4}>
                  <span className="text-danger">*</span>{translate("modals.privateCloudSettings.form.ucUrl.label")}
                </Form.Label>
                <Col sm={7}>
                  <Form.Control
                    {...register("ucUrl", {
                      required: translate("modals.privateCloudSettings.form.ucUrl.feedback.required"),
                      pattern: {
                        value: /^https?:\/\//,
                        message: translate("modals.privateCloudSettings.form.ucUrl.feedback.pattern"),
                      },
                      onChange: e => handleChangeUcUrlDebounced(e.target.value),
                    })}
                    type="text"
                    placeholder={translate("modals.privateCloudSettings.form.ucUrl.holder")}
                    isInvalid={Boolean(errors.ucUrl)}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.ucUrl?.message}
                  </Form.Control.Feedback>
                </Col>
              </Form.Group>
            </div>
            <div className="px-3 pb-3">
              {
                fields.map((field, index) => (
                  <RegionInputs
                    key={field.id}
                    id={field.id}
                    groupNameSuffix={index + 1}
                    onRemove={
                      isQueryApiAvailable
                        ? () => {
                          remove(index)
                        }
                        : undefined
                    }
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
            </div>
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
};

export default PrivateCloudSettings;
