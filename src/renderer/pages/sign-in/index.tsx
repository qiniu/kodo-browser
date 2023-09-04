// libs
import React, {useEffect, useState} from "react";
import {Card, Col, Container, Row} from "react-bootstrap";

// modules
import {useI18n} from "@renderer/modules/i18n";
import {privateEndpointPersistence} from "@renderer/modules/qiniu-client";
import {EndpointType} from "@renderer/modules/auth";
import PreferredEndpointType from "@renderer/modules/launch-config/preferred-endpoint-type";

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
  const [isValidPrivateEndpointSetting, setIsValidPrivateEndpointSetting] = useState(
    privateEndpointPersistence.validate()
  );
  useEffect(() => {
    const preferredEndpointType = Object.values(EndpointType)
      .find(t => t === PreferredEndpointType.preferredEndpointType);
    setFormDefaultValues(v => ({
      ...v,
      endpointType: preferredEndpointType ?? EndpointType.Public,
    }));
  }, []);

  // event handler
  const handleSavedPrivateEndpointSetting = () => {
    setIsValidPrivateEndpointSetting(
      privateEndpointPersistence.validate()
    );
  };

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
                isInvalidPrivateEndpointSetting={!isValidPrivateEndpointSetting}
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
        onSaved={handleSavedPrivateEndpointSetting}
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
