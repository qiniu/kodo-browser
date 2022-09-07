// libs
import React, {useState} from "react";
import {Card, Col, Container, Row} from "react-bootstrap";

// contexts
import {useI18n} from "@renderer/modules/i18n";

// modals
import {useDisplayModal} from "@renderer/components/modals/hooks";
import AkHistory from "@renderer/components/modals/ak-history";
import PrivateCloudSettings from "@renderer/components/modals/private-cloud-settings";

// locals
import "./login.scss";
import LoginForm, {LoginFormValues} from "./login-form";

const Login: React.FC = () => {
  // context states
  const {translate} = useI18n();

  // modal states
  const [
    isShowPrivateEndpointSetting,
    {
      showModal: handleClickPrivateEndpointSetting,
      closeModal: handleHidePrivateEndpointSetting,
    },
  ] = useDisplayModal();
  const [
    isShowAccessKeyHistory,
    {
      showModal: handleClickAccessKeyHistory,
      closeModal: handleHideAccessKeyHistory,
    },
  ] = useDisplayModal();

  // local states
  const [formDefaultValues, setFormDefaultValues] = useState<LoginFormValues>();

  return (
    <Container>
      <Row>
        <Col/>
        <Col className="login-page">
          <Card>
            <Card.Header as="h3">{translate("login.title")}</Card.Header>
            <Card.Body>
              <LoginForm
                defaultValues={formDefaultValues}
                onClickPrivateEndpointSetting={handleClickPrivateEndpointSetting}
                onClickAccessKeyHistory={handleClickAccessKeyHistory}
              />
            </Card.Body>
          </Card>
        </Col>
        <Col/>
      </Row>
      {
        isShowPrivateEndpointSetting
          ? <PrivateCloudSettings
            show
            dialogClassName="modal-720p"
            onHide={handleHidePrivateEndpointSetting}
          />
          : null // destroy when hidden
      }
      <AkHistory
        show={isShowAccessKeyHistory}
        size="xl"
        onHide={handleHideAccessKeyHistory}
        onActiveAk={(akItem) => {
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

export default Login;
