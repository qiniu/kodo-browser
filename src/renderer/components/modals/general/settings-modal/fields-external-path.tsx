import React from "react";
import {Col, Form, Row} from "react-bootstrap";
import {useFormContext} from "react-hook-form";

import {useI18n} from "@renderer/modules/i18n";
import {AppPreferencesData} from "@renderer/modules/user-config-store";

const FieldsExternalPath: React.FC = () => {
  const {translate} = useI18n();
  const {register} = useFormContext<AppPreferencesData>();

  return (
    <fieldset>
      <legend>{translate("modals.settings.externalPath.legend")}</legend>
      <Form.Group as={Row} className="mb-3" controlId="enabledExternalPath">
        <Form.Label className="text-end" column sm={5}>
          {translate("modals.settings.externalPath.form.enabled.label")}
        </Form.Label>
        <Col sm={6} className="d-flex align-items-center">
          <Form.Switch
            {...register("externalPathEnabled")}
            label={translate("modals.settings.externalPath.form.enabled.hint")}
          />
        </Col>
      </Form.Group>
    </fieldset>
  )
};

export default FieldsExternalPath;
