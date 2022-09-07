import {Button, Col, Form, FormControlProps, Row} from "react-bootstrap";
import React from "react";

import {useI18n} from "@renderer/modules/i18n";

// 规定整体的 onChange 是否可行？
interface RegionInputsProps {
  id: string,
  groupNameSuffix: string | number,
  regionIdentifierControlProps: FormControlProps,
  regionNameControlProps: FormControlProps,
  regionEndpointControlProps: FormControlProps,
  onRemove: () => void,
}

const RegionInputs: React.FC<RegionInputsProps> = (props) => {
  const {translate} = useI18n();

  return (
    <>
      <Row className="justify-content-between">
        <Col>{translate("modals.privateCloudSettings.region")}{props.groupNameSuffix}</Col>
        <Col className="text-end">
          <Button variant="lite-danger" size="sm" onClick={props.onRemove}>
            {translate("modals.privateCloudSettings.removeRegionButton")}
          </Button>
        </Col>
      </Row>
      <hr className="mt-0"/>
      <Form.Group as={Row} className="mb-3" controlId={`regionIdentifier-${props.id}`}>
        <Form.Label className="text-end" column sm={4}>
          <span className="text-danger">*</span>{translate("modals.privateCloudSettings.form.regionIdentifier.label")}
        </Form.Label>
        <Col sm={7}>
          <Form.Control
            {...props.regionIdentifierControlProps}
            type="text"
            placeholder={translate("modals.privateCloudSettings.form.regionIdentifier.holder")}
          />
          <Form.Control.Feedback type="invalid">
            {translate("modals.privateCloudSettings.form.regionIdentifier.feedback.required")}
          </Form.Control.Feedback>
        </Col>
      </Form.Group>
      <Form.Group as={Row} className="mb-3" controlId={`regionName-${props.id}`}>
        <Form.Label className="text-end" column sm={4}>
          {translate("modals.privateCloudSettings.form.regionName.label")}
        </Form.Label>
        <Col sm={7}>
          <Form.Control
            {...props.regionNameControlProps}
            type="text"
            placeholder={translate("modals.privateCloudSettings.form.regionName.holder")}
          />
        </Col>
      </Form.Group>
      <Form.Group as={Row} className="mb-3" controlId={`regionEndpoint-${props.id}`}>
        <Form.Label className="text-end" column sm={4}>
          <span className="text-danger">*</span>{translate("modals.privateCloudSettings.form.regionEndpoint.label")}
        </Form.Label>
        <Col sm={7}>
          <Form.Control
            {...props.regionEndpointControlProps}
            type="text"
            placeholder={translate("modals.privateCloudSettings.form.regionEndpoint.holder")}
          />
          <Form.Control.Feedback type="invalid">
            {translate("modals.privateCloudSettings.form.regionEndpoint.feedback.required")}
          </Form.Control.Feedback>
        </Col>
      </Form.Group>
    </>
  );
};

export default RegionInputs;
