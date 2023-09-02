import React, {useCallback, useEffect, useState} from "react";
import {Button, Col, Form, Modal, ModalProps, Row} from "react-bootstrap";
import {toast} from "react-hot-toast";
import {SubmitHandler, useFieldArray, useForm} from "react-hook-form";
import lodash from "lodash";

import {HttpUrl} from "@renderer/const/patterns";
import {useI18n} from "@renderer/modules/i18n";
import * as LocalLogger from "@renderer/modules/local-logger";
import {Endpoint, isQueryRegionAPIAvailable, privateEndpointPersistence} from "@renderer/modules/qiniu-client";

import RegionInputs from "./region-inputs";

interface PrivateCloudSettingsProps {
  onSaved: (data: Endpoint) => void,
}

const PrivateCloudSettings: React.FC<ModalProps & PrivateCloudSettingsProps> = ({
  onSaved,
  ...modalProps
}) => {
  const {translate} = useI18n();

  const {
    handleSubmit,
    control,
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

  const handleSavePrivateCloudSettings: SubmitHandler<Endpoint> = (data) => {
    LocalLogger.debug("save private cloud settings", data);
    privateEndpointPersistence.save({
      ucUrl: data.ucUrl,
      regions: hasCustomRegions
        ? data.regions
        : [],
    });
    toast.success(translate("common.saved"));
    onSaved(data);
    modalProps.onHide?.();
  };

  useEffect(() => {
    const endpoint = privateEndpointPersistence.read();
    if (endpoint.regions.length) {
      setHasCustomRegions(true);
    }
    reset(endpoint);
  }, [modalProps.show]);

  // check query region available
  const [debouncedUcUrl, setDebouncedUcUrl] = useState<string>("");
  const handleChangeUcUrlDebounced = useCallback(lodash.debounce((v: string) => {
    setDebouncedUcUrl(v);
  }, 300, {leading: false, trailing: true}), []);
  const [isQueryApiAvailable, setIsQueryApiAvailable] = useState<boolean>(true);
  useEffect(() => {
    if (errors.ucUrl || !debouncedUcUrl) {
      return;
    }
    isQueryRegionAPIAvailable(debouncedUcUrl)
      .then(available => {
        setIsQueryApiAvailable(available);
        setHasCustomRegions(true);
      });
  }, [debouncedUcUrl]);

  // custom regions switch
  const [hasCustomRegions, setHasCustomRegions] = useState(false);
  const handleChangeCustomRegions = () => {
    setHasCustomRegions(v => !v);
  };
  useEffect(() => {
    if (hasCustomRegions && !fields.length) {
      setValue("regions", [{
        identifier: "",
        label: "",
        endpoint: "",
      }]);
    }
  }, [hasCustomRegions, fields.length, setValue]);

  // render
  const renderRegionFields = () => {
    if (!hasCustomRegions) {
      return null;
    }
    return (
      <div className="px-3">
        {
          fields.map((field, index) => (
            <RegionInputs
              key={field.id}
              id={field.id}
              groupNameSuffix={index + 1}
              errors={errors.regions?.[index]}
              onRemove={
                fields.length > 1
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
                    required: translate("modals.privateCloudSettings.form.regionEndpoint.feedback.required"),
                    pattern: {
                      value: HttpUrl,
                      message: translate("modals.privateCloudSettings.form.regionEndpoint.feedback.pattern"),
                    },
                  },
                ),
                isInvalid: Boolean(errors?.regions?.[index]?.endpoint),
              }}
            />
          ))
        }

        <div className="row px-3 pb-3 sticky-bottom bg-body">
          <Button
            variant="info"
            className="text-white"
            size="sm"
            disabled={isSubmitting}
            onClick={() => {
              append({identifier: "", label: "", endpoint: ""})
            }}
          >
            <i className="bi bi-plus-circle-fill me-1"/>
            {translate("modals.privateCloudSettings.appendRegionButton")}
          </Button>
        </div>
      </div>
    );
  };

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
              <Form.Group as={Row} className="mb-3" controlId="privateCloudSettingUcUrl">
                <Form.Label className="text-end" column sm={4}>
                  <span className="text-danger">*</span>{translate("modals.privateCloudSettings.form.ucUrl.label")}
                </Form.Label>
                <Col sm={7}>
                  <Form.Control
                    {...register("ucUrl", {
                      required: translate("modals.privateCloudSettings.form.ucUrl.feedback.required"),
                      pattern: {
                        value: HttpUrl,
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
              <Form.Group as={Row} controlId="customRegionsSwitch">
                <Form.Label className="text-end" column sm={4}>
                  {translate("modals.privateCloudSettings.form.regionsSwitch.label")}
                </Form.Label>
                <Col sm={7} className="d-flex align-items-center">
                  <Form.Switch
                    disabled={!isQueryApiAvailable}
                    checked={hasCustomRegions}
                    onChange={handleChangeCustomRegions}
                  />
                  {
                    !isQueryApiAvailable &&
                    <span className="text-secondary small">
                      {translate("modals.privateCloudSettings.form.regionsSwitch.hint.disabled")}
                    </span>
                  }
                </Col>
              </Form.Group>
            </div>
            {renderRegionFields()}
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
