import React from "react";
import {Container, Navbar} from "react-bootstrap";

import * as APP_INFO from "@common/const/app-config";
import {useI18n} from "@renderer/modules/i18n";

import "./top.scss";
import MenuContents from "./menu-contents";

const Top: React.FC = () => {
  const {translate} = useI18n();

  return (
    <Navbar className="no-selectable" bg="dark" variant="dark" expand="sm">
      <Container fluid>
        <Navbar.Brand>
          <img
            alt="logo"
            src={APP_INFO.app.logo}
            className="d-inline-block align-top"
            width="30"
            height="30"
          />
          <span className="app-name">{translate("common.kodoBrowser")}</span>
          <span className="app-version">v{APP_INFO.app.version}</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav"/>
        <Navbar.Collapse id="basic-navbar-nav justify-content-between">
          <MenuContents/>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
};

export default Top;
