// libs
import React, {useEffect, useState} from "react";
import {Card, Col, Container, Row} from "react-bootstrap";

// modules
import {useI18n} from "@renderer/modules/i18n";
import * as DefaultDict from "@renderer/modules/default-dict";
import {EndpointType} from "@renderer/modules/auth";
import {useEndpointConfig} from "@renderer/modules/user-config-store";

// modals
import {useDisplayModal} from "@renderer/components/modals/hooks";
import AkHistory from "@renderer/components/modals/general/ak-history";
import PrivateCloudSettings from "@renderer/components/modals/general/private-cloud-settings";

// locals
import "./sign-in.scss";
import SignInForm, {SignInFormValues} from "./sign-in-form";

const SignIn: React.FC = () => {
  // context states
  const {translate} = useI18n();

  const {
    endpointConfigState,
  } = useEndpointConfig(null);

  // modal states
  const [
    {
      show: isShowPrivateEndpointSetting,
    },
    {
      showModal: handleClickPrivateEndpointSetting,
      hideModal: handleHidePrivateEndpointSetting,
    },
  ] = useDisplayModal();
  const [
    {
      show:isShowAccessKeyHistory,
    },
    {
      showModal: handleClickAccessKeyHistory,
      hideModal: handleHideAccessKeyHistory,
    },
  ] = useDisplayModal();

  // local states
  const [formDefaultValues, setFormDefaultValues] = useState<SignInFormValues>({
    endpointType: EndpointType.Public,
    accessKey: "",
    accessSecret: "",
    rememberMe: false,
  });
  useEffect(() => {
    const endpointType = Object.values(EndpointType)
      .find(t => t === DefaultDict.get("LOGIN_ENDPOINT_TYPE"))
    setFormDefaultValues(v => ({
      ...v,
      endpointType: endpointType ?? EndpointType.Public,
    }))
  }, []);

  // render
  return (
    <Container>
      <Row>
        <Col/>
        <Col className="sign-in-page">
          <Card>
            <Card.Header as="h4">{translate("signIn.title")}</Card.Header>
            <Card.Body>
              <SignInForm
                defaultValues={formDefaultValues}
                isInvalidPrivateEndpointSetting={!endpointConfigState.valid}
                onClickPrivateEndpointSetting={handleClickPrivateEndpointSetting}
                onClickAccessKeyHistory={handleClickAccessKeyHistory}
              />
            </Card.Body>
          </Card>
        </Col>
        <Col/>
      </Row>
      <PrivateCloudSettings
        show={isShowPrivateEndpointSetting}
        dialogClassName="modal-720p"
        onHide={handleHidePrivateEndpointSetting}
      />
      <AkHistory
        show={isShowAccessKeyHistory}
        size="xl"
        onHide={handleHideAccessKeyHistory}
        onActiveAk={akItem => {
          setFormDefaultValues({
            ...akItem,
            rememberMe: true,
          });
          handleHideAccessKeyHistory();
        }}
      />
    </Container>
  )
};

export default SignIn;
