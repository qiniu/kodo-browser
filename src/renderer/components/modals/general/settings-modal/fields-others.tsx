import React from "react";
import {Col, Form, Row} from "react-bootstrap";

import {LangName, useI18n} from "@renderer/modules/i18n";
import {useFormContext} from "react-hook-form";

const FieldsExternalPath: React.FC = () => {
  const {translate} = useI18n();
  const {
    register,
    formState: {
      errors,
    },
  } = useFormContext();

  return (
    <fieldset>
      <legend>{translate("modals.settings.others.legend")}</legend>
      <Form.Group as={Row} className="mb-3" controlId="enabledDebugLog">
        <Form.Label className="text-end" column sm={5}>
          {translate("modals.settings.others.form.isDebug.label")}
        </Form.Label>
        <Col sm={6} className="d-flex align-items-center">
          <Form.Switch
            {...register("enabledDebugLog")}
            label={translate("modals.settings.others.form.isDebug.hint")}
          />
        </Col>
      </Form.Group>

      <Form.Group as={Row} className="mb-3" controlId="enabledLoadFilesOnTouchEnd">
        <Form.Label className="text-end" column sm={5}>
          {translate("modals.settings.others.form.enabledLoadFilesOnTouchEnd.label")}
        </Form.Label>
        <Col sm={6} className="d-flex align-items-center">
          <Form.Switch
            {...register("enabledLoadFilesOnTouchEnd")}
            label={translate("modals.settings.others.form.enabledLoadFilesOnTouchEnd.hint")}
          />
        </Col>
      </Form.Group>

      <Form.Group as={Row} className="mb-3" controlId="loadFilesNumberPerPage">
        <Form.Label className="text-end" column sm={5}>
          {translate("modals.settings.others.form.loadFilesNumberPerPage.label")}
        </Form.Label>
        <Col sm={6}>
          <Form.Control
            {...register("loadFilesNumberPerPage", {
              valueAsNumber: true,
              required: true,
              /*
               * The min can't be 1,
               *   because when list a subdirectory, list API will return the subdirectory itself first.
               *   so we can't get any files in the subdirectory,
               *   and the ui component will get nothing to render, and will not trigger load more forever.
               * And the min can't be too large, such as 100,
               *   because list API is too slow in some private cloud.
               */
              min: 10,
              max: 1000,
            })}
            type="number"
            isInvalid={Boolean(errors.loadFilesNumberPerPage)}
          />
          <Form.Text
            className={
              Boolean(errors.loadFilesNumberPerPage)
                ? "text-danger"
                : ""
            }
          >
            {translate("modals.settings.others.form.loadFilesNumberPerPage.hint")}
          </Form.Text>
        </Col>
      </Form.Group>

      <Form.Group as={Row} className="mb-3" controlId="enabledAutoUpdateApp">
        <Form.Label className="text-end" column sm={5}>
          {translate("modals.settings.others.form.autoUpgrade.label")}
        </Form.Label>
        <Col sm={6} className="d-flex align-items-center">
          <Form.Switch
            {...register("enabledAutoUpdateApp")}
            label={translate("modals.settings.others.form.autoUpgrade.hint")}
          />
        </Col>
      </Form.Group>

      <Form.Group as={Row} className="mb-3" controlId="language">
        <Form.Label className="text-end" column sm={5}>
          <i className="bi bi-translate me-1"/>
          {translate("modals.settings.others.form.language.label")}
        </Form.Label>
        <Col sm={6} className="d-flex align-items-center">
          <Form.Select
            {...register("language")}
          >
            <option value={LangName.ZH_CN}>中文</option>
            <option value={LangName.EN_US}>English</option>
            <option value={LangName.JA_JP}>日本語</option>
          </Form.Select>
        </Col>
      </Form.Group>
    </fieldset>
  )
};

export default FieldsExternalPath;
