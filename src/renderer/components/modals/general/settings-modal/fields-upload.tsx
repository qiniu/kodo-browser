import React from "react";
import {Col, Form, Row} from "react-bootstrap";

import {useI18n} from "@renderer/modules/i18n";
import {useFormContext} from "react-hook-form";

const FieldsUpload: React.FC = () => {
  const {translate} = useI18n();
  const {
    register,
    watch,
    formState: {
      errors,
    },
  } = useFormContext();

  return (
    <fieldset>
      <legend>{translate("modals.settings.upload.legend")}</legend>
      <Form.Group as={Row} className="mb-3" controlId="enabledResumeUpload">
        <Form.Label className="text-end" column sm={5}>
          {translate("modals.settings.upload.form.resumeUpload.label")}
        </Form.Label>
        <Col sm={6} className="d-flex align-items-center">
          <Form.Switch
            {...register("enabledResumeUpload")}
            label={translate("modals.settings.upload.form.resumeUpload.hint")}
          />
        </Col>
      </Form.Group>
      <Form.Group as={Row} className="mb-3" controlId="multipartUploadThreshold">
        <Form.Label className="text-end" column sm={5}>
          {translate("modals.settings.upload.form.multipartUploadThreshold.label")}
        </Form.Label>
        <Col sm={6}>
          <Form.Control
            {...register("multipartUploadThreshold", {
              required: true,
              min: 10,
              max: 1000,
            })}
            type="number"
            isInvalid={Boolean(errors.multipartUploadThreshold)}
          />
          <Form.Text
            className={
              Boolean(errors.multipartUploadThreshold)
                ? "text-danger"
                : ""
            }
          >
            {translate("modals.settings.upload.form.multipartUploadThreshold.hint")}
          </Form.Text>
        </Col>
      </Form.Group>
      <Form.Group as={Row} className="mb-3" controlId="multipartUploadPartSize">
        <Form.Label className="text-end" column sm={5}>
          {translate("modals.settings.upload.form.multipartUploadPartSize.label")}
        </Form.Label>
        <Col sm={6}>
          <Form.Control
            {...register("multipartUploadPartSize", {
              required: true,
              min: 8,
              max: 100,
            })}
            type="number"
            isInvalid={Boolean(errors.multipartUploadPartSize)}
          />
          <Form.Text
            className={
              Boolean(errors.multipartUploadPartSize)
                ? "text-danger"
                : ""
            }
          >
            {translate("modals.settings.upload.form.multipartUploadPartSize.hint")}
          </Form.Text>
        </Col>
      </Form.Group>
      <Form.Group as={Row} className="mb-3" controlId="maxUploadConcurrency">
        <Form.Label className="text-end" column sm={5}>
          {translate("modals.settings.upload.form.maxUploadConcurrency.label")}
        </Form.Label>
        <Col sm={6}>
          <Form.Control
            {...register("maxUploadConcurrency", {
              required: true,
              min: 1,
              max: 10,
            })}
            type="number"
            isInvalid={Boolean(errors.maxUploadConcurrency)}
          />
          <Form.Text
            className={
              Boolean(errors.maxUploadConcurrency)
                ? "text-danger"
                : ""
            }
          >
            {translate("modals.settings.upload.form.maxUploadConcurrency.hint")}
          </Form.Text>
        </Col>
      </Form.Group>
      <Form.Group as={Row} className="mb-3" controlId="enabledUploadSpeedLimit">
        <Form.Label className="text-end" column sm={5}>
          {translate("modals.settings.upload.form.enabledUploadSpeedLimit.label")}
        </Form.Label>
        <Col sm={6} className="d-flex align-items-center">
          <Form.Switch
            {...register("enabledUploadSpeedLimit")}
            label={translate("modals.settings.upload.form.enabledUploadSpeedLimit.hint")}
          />
        </Col>
      </Form.Group>
      <Form.Group as={Row} className="mb-3" controlId="uploadSpeedLimit">
        <Form.Label className="text-end" column sm={5}>
          {translate("modals.settings.upload.form.uploadSpeedLimit.label")}
        </Form.Label>
        <Col sm={6}>
          <Form.Control
            {...register("uploadSpeedLimit", {
              required: true,
              min: 1,
              max: 102400,
              disabled: !watch("enabledUploadSpeedLimit")
            })}
            type="number"
            isInvalid={Boolean(errors.uploadSpeedLimit)}
          />
          <Form.Text
            className={
              Boolean(errors.uploadSpeedLimit)
                ? "text-danger"
                : ""
            }
          >
            {translate("modals.settings.upload.form.uploadSpeedLimit.hint")}
          </Form.Text>
        </Col>
      </Form.Group>
    </fieldset>
  );
};

export default FieldsUpload;
