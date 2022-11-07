import React from "react";
import {Container, Navbar} from "react-bootstrap";
import classNames from "classnames";

import {app} from "@common/const/app-config";
import {useI18n} from "@renderer/modules/i18n";

import {MenuItem} from "./menu-item";
import MenuContents from "./menu-contents";
import "./top.scss";

interface TopProps {
  onClickVersion?: (version: string) => void,
  defaultMenuItems: MenuItem[],
  singedInMenuItems: MenuItem[],
}

const Top: React.FC<TopProps> = ({
  onClickVersion,
  defaultMenuItems,
  singedInMenuItems,
}) => {
  const {translate} = useI18n();

  return (
    <Navbar className="no-selectable" bg="dark" variant="dark" expand="sm">
      <Container fluid>
        <Navbar.Brand>
          <img
            alt="logo"
            src={app.logo}
            className="d-inline-block align-top"
            width="30"
            height="30"
          />
          <span className="app-name">{translate("common.kodoBrowser")}</span>
          <span
            className={classNames(
              "app-version",
              {
                "clickable": onClickVersion !== undefined,
              }
            )}
            tabIndex={onClickVersion ? 0 : undefined}
            onClick={() => onClickVersion?.(app.version)}
          >
            v{app.version}
          </span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav"/>
        <Navbar.Collapse id="basic-navbar-nav justify-content-between">
          <MenuContents
            defaultMenuItems={defaultMenuItems}
            singedInMenuItems={singedInMenuItems}
          />
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
};

export default Top;
