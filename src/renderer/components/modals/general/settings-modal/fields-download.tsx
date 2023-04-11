import React from "react";
import {Col, Form, Row} from "react-bootstrap";

import {useI18n} from "@renderer/modules/i18n";
import {useFormContext} from "react-hook-form";

const FieldsDownload: React.FC = () => {
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
      <legend>{translate("modals.settings.download.legend")}</legend>
      <Form.Group as={Row} className="mb-3" controlId="enabledResumeDownload">
        <Form.Label className="text-end" column sm={5}>
          {translate("modals.settings.download.form.resumeDownload.label")}
        </Form.Label>
        <Col sm={6} className="d-flex align-items-center">
          <Form.Switch
            {...register("enabledResumeDownload")}
            label={translate("modals.settings.download.form.resumeDownload.hint")}
          />
        </Col>
      </Form.Group>
      <Form.Group as={Row} className="mb-3" controlId="multipartDownloadThreshold">
        <Form.Label className="text-end" column sm={5}>
          {translate("modals.settings.download.form.multipartDownloadThreshold.label")}
        </Form.Label>
        <Col sm={6}>
          <Form.Control
            {...register("multipartDownloadThreshold", {
              valueAsNumber: true,
              required: true,
              min: 10,
              max: 1000,
            })}
            type="number"
            isInvalid={Boolean(errors.multipartDownloadThreshold)}
          />
          <Form.Text
            className={
              Boolean(errors.multipartDownloadThreshold)
                ? "text-danger"
                : ""
            }
          >
            {translate("modals.settings.download.form.multipartDownloadThreshold.hint")}
          </Form.Text>
        </Col>
      </Form.Group>
      <Form.Group as={Row} className="mb-3" controlId="multipartDownloadPartSize">
        <Form.Label className="text-end" column sm={5}>
          {translate("modals.settings.download.form.multipartDownloadPartSize.label")}
        </Form.Label>
        <Col sm={6}>
          <Form.Control
            {...register("multipartDownloadPartSize", {
              valueAsNumber: true,
              required: true,
              min: 8,
              max: 100,
            })}
            type="number"
            isInvalid={Boolean(errors.multipartDownloadPartSize)}
          />
          <Form.Text
            className={
              Boolean(errors.multipartDownloadPartSize)
                ? "text-danger"
                : ""
            }
          >
            {translate("modals.settings.download.form.multipartDownloadPartSize.hint")}
          </Form.Text>
        </Col>
      </Form.Group>
      <Form.Group as={Row} className="mb-3" controlId="maxDownloadConcurrency">
        <Form.Label className="text-end" column sm={5}>
          {translate("modals.settings.download.form.maxDownloadConcurrency.label")}
        </Form.Label>
        <Col sm={6}>
          <Form.Control
            {...register("maxDownloadConcurrency", {
              valueAsNumber: true,
              required: true,
              min: 1,
              max: 10,
            })}
            type="number"
            isInvalid={Boolean(errors.maxDownloadConcurrency)}
          />
          <Form.Text
            className={
              Boolean(errors.maxDownloadConcurrency)
                ? "text-danger"
                : ""
            }
          >
            {translate("modals.settings.download.form.maxDownloadConcurrency.hint")}
          </Form.Text>
        </Col>
      </Form.Group>
      <Form.Group as={Row} className="mb-3" controlId="enabledDownloadSpeedLimit">
        <Form.Label className="text-end" column sm={5}>
          {translate("modals.settings.download.form.enabledDownloadSpeedLimit.label")}
        </Form.Label>
        <Col sm={6} className="d-flex align-items-center">
          <Form.Switch
            {...register("enabledDownloadSpeedLimit")}
            label={translate("modals.settings.download.form.enabledDownloadSpeedLimit.hint")}
          />
        </Col>
      </Form.Group>
      <Form.Group as={Row} className="mb-3" controlId="downloadSpeedLimit">
        <Form.Label className="text-end" column sm={5}>
          {translate("modals.settings.download.form.downloadSpeedLimit.label")}
        </Form.Label>
        <Col sm={6}>
          <Form.Control
            {...register("downloadSpeedLimit", {
              valueAsNumber: true,
              required: true,
              min: 1,
              max: 102400,
              disabled: !watch("enabledDownloadSpeedLimit")
            })}
            type="number"
            isInvalid={Boolean(errors.downloadSpeedLimit)}
          />
          <Form.Text
            className={
              Boolean(errors.downloadSpeedLimit)
                ? "text-danger"
                : ""
            }
          >
            {translate("modals.settings.download.form.downloadSpeedLimit.hint")}
          </Form.Text>
        </Col>
      </Form.Group>
    </fieldset>
  );
};

export default FieldsDownload;
