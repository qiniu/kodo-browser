import {Button, Col, Form, FormControlProps, Row} from "react-bootstrap";
import React from "react";
import {FieldErrors} from "react-hook-form";

import {useI18n} from "@renderer/modules/i18n";
import {RegionSetting} from "@renderer/modules/qiniu-client";

// the other way to implement this is using useController
interface RegionInputsProps {
  id: string,
  groupNameSuffix: string | number,
  errors?: FieldErrors<RegionSetting>,
  regionIdentifierControlProps: FormControlProps,
  regionNameControlProps: FormControlProps,
  regionEndpointControlProps: FormControlProps,
  onRemove?: () => void,
}

const RegionInputs: React.FC<RegionInputsProps> = ({
  id,
  groupNameSuffix,
  errors,
  regionIdentifierControlProps,
  regionNameControlProps,
  regionEndpointControlProps,
  onRemove,
}) => {
  const {translate} = useI18n();

  return (
    <>
      <Row className="justify-content-between sticky-top bg-body" style={{top: "7.3125rem"}}>
        <Col>{translate("modals.privateCloudSettings.region")}{groupNameSuffix}</Col>
        {
          onRemove &&
          <Col className="text-end">
            <Button variant="lite-danger" size="sm" onClick={onRemove}>
              {translate("modals.privateCloudSettings.removeRegionButton")}
            </Button>
          </Col>
        }
      </Row>
      <hr className="mt-0"/>
      <Form.Group as={Row} className="mb-3" controlId={`regionIdentifier-${id}`}>
        <Form.Label className="text-end" column sm={4}>
          <span className="text-danger">*</span>{translate("modals.privateCloudSettings.form.regionIdentifier.label")}
        </Form.Label>
        <Col sm={7}>
          <Form.Control
            {...regionIdentifierControlProps}
            type="text"
            placeholder={translate("modals.privateCloudSettings.form.regionIdentifier.holder")}
          />
          <Form.Control.Feedback type="invalid">
            {translate("modals.privateCloudSettings.form.regionIdentifier.feedback.required")}
          </Form.Control.Feedback>
        </Col>
      </Form.Group>
      <Form.Group as={Row} className="mb-3" controlId={`regionName-${id}`}>
        <Form.Label className="text-end" column sm={4}>
          {translate("modals.privateCloudSettings.form.regionName.label")}
        </Form.Label>
        <Col sm={7}>
          <Form.Control
            {...regionNameControlProps}
            type="text"
            placeholder={translate("modals.privateCloudSettings.form.regionName.holder")}
          />
        </Col>
      </Form.Group>
      <Form.Group as={Row} className="mb-3" controlId={`regionEndpoint-${id}`}>
        <Form.Label className="text-end" column sm={4}>
          <span className="text-danger">*</span>{translate("modals.privateCloudSettings.form.regionEndpoint.label")}
        </Form.Label>
        <Col sm={7}>
          <Form.Control
            {...regionEndpointControlProps}
            type="text"
            placeholder={translate("modals.privateCloudSettings.form.regionEndpoint.holder")}
          />
          <Form.Control.Feedback type="invalid">
            {errors?.endpoint?.message}
          </Form.Control.Feedback>
        </Col>
      </Form.Group>
    </>
  );
};

export default RegionInputs;
