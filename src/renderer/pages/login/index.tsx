// libs
import React from "react";
import {Card, Col, Container, Row} from "react-bootstrap";

// contexts
import {useI18n} from "@renderer/modules/i18n";

// locals
import "./login.scss";
import LoginForm from "./login-form";

const Login: React.FC = () => {
  // context states
  const {translate} = useI18n();

  return (
    <Container>
      <Row>
        <Col/>
        <Col className="login-page">
          <Card>
            <Card.Header as="h3">{translate("login.title")}</Card.Header>
            <Card.Body>
              <LoginForm/>
            </Card.Body>
          </Card>
        </Col>
        <Col/>
      </Row>
    </Container>
  )
};

export default Login;
