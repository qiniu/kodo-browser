import {Form, Nav} from "react-bootstrap";
import {LangName, useI18n} from "@renderer/modules/i18n";
import React from "react";

const MenuContents: React.FC = () => {
  const {translate, setLanguage} = useI18n();

  return (
    <>
      <Nav className="flex-grow-1">
        <Nav className="flex-grow-1">
          <Nav.Link>
            <i className="bi bi-folder2 me-2"/>
            {translate("top.files")}
          </Nav.Link>
          <Nav.Link>
            <i className="bi bi-star-fill me-2"/>
            {translate("top.bookmarks")}
          </Nav.Link>
          <Nav.Link>
            <i className="bi bi-gear-fill me-2"/>
            {translate("top.settings")}
          </Nav.Link>
          <Nav.Link>
            <i className="bi bi-info-lg"/>
            {translate("top.about")}
          </Nav.Link>
        </Nav>
      </Nav>
      <Form className="d-flex flex-grow-0 align-items-center">
        <div className="text-light flex-shrink-0 pe-1">{translate("top.language")}</div>
        <Form.Select
          size="sm"
          onChange={(e) => {
            setLanguage(e.target.value as LangName)
          }}
        >
          <option value={LangName.ZH_CN}>中文</option>
          <option value={LangName.EN_US}>English</option>
          {/*<option value="ja-jp">日语</option>*/}
        </Form.Select>
      </Form>
    </>
  );
}

export default MenuContents;
