import React from "react";
import {Modal, ModalProps} from "react-bootstrap";
import {shell} from "electron"

import {useI18n} from "@renderer/modules/i18n";
import * as APP_INFO from "@common/const/app-config";

import PreviewUpdate from "./preview-update";
import "./about.scss";

const About: React.FC<ModalProps> = (modalProps) => {
  const {translate} = useI18n();

  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-info-lg me-1"/>
          {translate("modals.about.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="about-brand text-center">
          <img
            alt="logo"
            src={APP_INFO.app.logo}
            className="d-inline-block"
            width="30"
            height="30"
          />
          <span className="app-name">{translate("common.kodoBrowser")}</span>
          <span className="app-version">v{APP_INFO.app.version}</span>
        </div>
        <div className="text-center">
          {translate("modals.about.openSourceAddress")}
          <span
            tabIndex={0}
            className="text-link"
            onClick={() => shell.openExternal("https://github.com/qiniu/kodo-browser")}
            onKeyUp={e => e.code === "Space" && shell.openExternal("https://github.com/qiniu/kodo-browser")}
          >
            https://github.com/qiniu/kodo-browser
          </span>
        </div>
        <hr/>
        <PreviewUpdate/>
      </Modal.Body>
    </Modal>
  )
};

export default About;
