import React from "react";
import {Col, Form, Row} from "react-bootstrap";
import {useFormContext} from "react-hook-form";

import {Translate, useI18n} from "@renderer/modules/i18n";
import * as DefaultDict from "@renderer/modules/default-dict";
import {AppPreferencesData} from "@renderer/modules/user-config-store";

const FieldsUpload: React.FC = () => {
  const {translate} = useI18n();
  const {
    register,
    watch,
    formState: {
      errors,
    },
  } = useFormContext<AppPreferencesData>();

  const fieldRanges = {
    multipartUploadPartSize: {
      min: 1,
      max: DefaultDict.get("PREFERENCE_VALIDATORS")?.maxMultipartUploadPartSize || 100,
    },
    multipartUploadConcurrency: {
      min: 1,
      max: DefaultDict.get("PREFERENCE_VALIDATORS")?.maxMultipartUploadConcurrency || 5,
    },
    uploadJobConcurrency: {
      min: 1,
      max: DefaultDict.get("PREFERENCE_VALIDATORS")?.maxUploadJobConcurrency || 10,
    },
  };

  return (
    <fieldset>
      <legend>{translate("modals.settings.upload.legend")}</legend>
      <Form.Group as={Row} className="mb-3" controlId="enabledResumeUpload">
        <Form.Label className="text-end" column sm={5}>
          {translate("modals.settings.upload.form.resumeUpload.label")}
        </Form.Label>
        <Col sm={6} className="d-flex align-items-center">
          <Form.Switch
            {...register("resumeUploadEnabled")}
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
              valueAsNumber: true,
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
              valueAsNumber: true,
              required: true,
              min: fieldRanges.multipartUploadPartSize.min,
              max: fieldRanges.multipartUploadPartSize.max,
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
            <Translate
              i18nKey="modals.settings.upload.form.multipartUploadPartSize.hint"
              data={{
                min: fieldRanges.multipartUploadPartSize.min.toString(),
                max: fieldRanges.multipartUploadPartSize.max.toString(),
              }}
            />
          </Form.Text>
        </Col>
      </Form.Group>
      <Form.Group as={Row} className="mb-3" controlId="multipartUploadConcurrency">
        <Form.Label className="text-end" column sm={5}>
          {translate("modals.settings.upload.form.multipartUploadConcurrency.label")}
        </Form.Label>
        <Col sm={6}>
          <Form.Control
            {...register("multipartUploadConcurrency", {
              valueAsNumber: true,
              required: true,
              min: fieldRanges.multipartUploadConcurrency.min,
              max: fieldRanges.multipartUploadConcurrency.max,
            })}
            type="number"
            isInvalid={Boolean(errors.multipartUploadConcurrency)}
          />
          <Form.Text
            className={
              Boolean(errors.multipartUploadConcurrency)
                ? "text-danger"
                : ""
            }
          >
            <Translate
              i18nKey="modals.settings.upload.form.multipartUploadConcurrency.hint"
              data={{
                min: fieldRanges.multipartUploadConcurrency.min.toString(),
                max: fieldRanges.multipartUploadConcurrency.max.toString(),
              }}
            />
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
              valueAsNumber: true,
              required: true,
              min: fieldRanges.uploadJobConcurrency.min,
              max: fieldRanges.uploadJobConcurrency.max,
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
            <Translate
              i18nKey="modals.settings.upload.form.maxUploadConcurrency.hint"
              data={{
                min: fieldRanges.uploadJobConcurrency.min.toString(),
                max: fieldRanges.uploadJobConcurrency.max.toString(),
              }}
            />
          </Form.Text>
        </Col>
      </Form.Group>
      <Form.Group as={Row} className="mb-3" controlId="enabledUploadSpeedLimit">
        <Form.Label className="text-end" column sm={5}>
          {translate("modals.settings.upload.form.enabledUploadSpeedLimit.label")}
        </Form.Label>
        <Col sm={6} className="d-flex align-items-center">
          <Form.Switch
            {...register("uploadSpeedLimitEnabled")}
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
            {...register("uploadSpeedLimitKbPerSec", {
              valueAsNumber: true,
              required: true,
              min: 1,
              max: 102400,
              disabled: !watch("uploadSpeedLimitEnabled")
            })}
            type="number"
            isInvalid={Boolean(errors.uploadSpeedLimitKbPerSec)}
          />
          <Form.Text
            className={
              Boolean(errors.uploadSpeedLimitKbPerSec)
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
