import React, {ReactNode} from "react";
import {Form, Nav, NavDropdown} from "react-bootstrap";

import {LangName, useI18n} from "@renderer/modules/i18n";
import {AkItem, useAuth} from "@renderer/modules/auth";

import {MenuItem, MenuItemType} from "./menu-item";
import {useDisplayModal} from "@renderer/components/modals/hooks";
import AkHistory from "@renderer/components/modals/general/ak-history";
import {useNavigate} from "react-router-dom";
import RoutePath from "@renderer/pages/route-path";
import Settings from "@renderer/modules/settings";

interface MenuContentsProps {
  defaultMenuItems: MenuItem[],
  singedInMenuItems: MenuItem[],
}

function renderItems(menuList: MenuItem[]): ReactNode {
  return menuList.map(menuItem => (
    menuItem.type === MenuItemType.Link
      ? <Nav.Link
        key={menuItem.id}
        active={menuItem.active}
        onClick={() => menuItem.onClick?.(menuItem)}
      >
        {
          menuItem.iconClassName
            ? <i className={menuItem.iconClassName}/>
            : null
        }
        {menuItem.text}
      </Nav.Link>
      : <NavDropdown
        key={menuItem.id}
        id={menuItem.id}
        title={menuItem.text}
      >
        {
          menuItem.items.map(dropdownItem => (
            <NavDropdown.Item
              key={dropdownItem.id}
              active={dropdownItem.active}
              onClick={() => dropdownItem.onClick?.(dropdownItem)}
            >
              {
                dropdownItem.iconClassName
                  ? <i className={dropdownItem.iconClassName}/>
                  : null
              }
              {dropdownItem.text}
            </NavDropdown.Item>
          ))
        }
      </NavDropdown>
  ));
}

const MenuContents: React.FC<MenuContentsProps> = (props) => {
  const {currentLanguage, setLanguage, translate} = useI18n();
  const {currentUser} = useAuth();
  const navigate = useNavigate();

  const {
    defaultMenuItems,
    singedInMenuItems,
  } = props;

  const [
    {
      show:isShowAccessKeyHistory,
    },
    {
      showModal: handleClickAccessKeyHistory,
      closeModal: handleHideAccessKeyHistory,
    },
  ] = useDisplayModal();

  const handleActiveAk = (akItem: AkItem) => {
    navigate(RoutePath.SwitchUser, {
      state: akItem,
    });
    handleHideAccessKeyHistory();
  }

  const handleLogout = () => {
    navigate(RoutePath.SignOut)
  }

  // render
  if (currentUser) {
    return (
      <>
        <Nav className="flex-grow-1">
          {renderItems(singedInMenuItems)}
        </Nav>
        <Nav className="ms-auto">
          <NavDropdown
            align="end"
            id="user-menu"
            title={
              <i className="bi bi-person-circle me-1"/>
            }
          >
            <NavDropdown.Item
              onClick={handleClickAccessKeyHistory}
            >
              <i className="bi bi-people-fill me-1"/>
              {translate("top.switchUser")}
            </NavDropdown.Item>
            <NavDropdown.Item
              onClick={handleLogout}
            >
              <i className="bi bi-door-open-fill me-1 text-danger"/>
              {translate("top.signOut")}
            </NavDropdown.Item>
          </NavDropdown>
        </Nav>
        <AkHistory
          size="xl"
          show={isShowAccessKeyHistory}
          onHide={handleHideAccessKeyHistory}
          onActiveAk={handleActiveAk}
        />
      </>
    );
  }

  return (
    <>
      <Nav className="flex-grow-1">
        {
          renderItems(defaultMenuItems)
        }
      </Nav>
      <Form className="d-flex flex-grow-0 align-items-center">
        <div className="text-light flex-shrink-0 pe-1">{translate("top.language")}</div>
        <Form.Select
          size="sm"
          defaultValue={currentLanguage}
          onChange={e => {
            Settings.language = e.target.value as LangName;
            setLanguage(e.target.value as LangName);
          }}
        >
          <option value={LangName.ZH_CN}>中文</option>
          <option value={LangName.EN_US}>English</option>
          {/*<option value="{LangName.JA_JP">日本語</option>*/}
        </Form.Select>
      </Form>
    </>
  );
}

export default MenuContents;
