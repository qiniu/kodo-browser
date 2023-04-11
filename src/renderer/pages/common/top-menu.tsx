import React, {useEffect, useState} from "react";
import {useLocation} from "react-router-dom";

import {useI18n} from "@renderer/modules/i18n";
import {BookmarkItem, ExternalPathItem} from "@renderer/modules/kodo-address";
import Settings, {OnChangeCallback, SettingKey} from "@renderer/modules/settings";

import Top from "@renderer/components/top";
import {MenuItem, MenuItemType} from "@renderer/components/top/menu-item";

import {useDisplayModal} from "@renderer/components/modals/hooks";
import SettingsModal from "@renderer/components/modals/general/settings-modal";
import BookmarkManager from "@renderer/components/modals/general/bookmark-manager";
import About from "@renderer/components/modals/general/about";
import ReleaseNoteModal from "@renderer/components/modals/general/release-note-modal";

import AboutMenuItem from "./about-menu-item";
import ExternalPathManager from "@renderer/components/modals/general/external-path-manager";

interface TopMenuProps {
  onActiveKodoAddress: (kodoAddress: BookmarkItem | ExternalPathItem) => void,
}

const TopMenu: React.FC<TopMenuProps> = ({
  onActiveKodoAddress,
}) => {
  const {translate} = useI18n();
  const location = useLocation();

  const [enabledExternalPath, setEnabledExternalPath] = useState(Settings.externalPathEnabled);
  useEffect(() => {
    const handleChangeExternalPath: OnChangeCallback = ({key, value}) => {
      if (key === SettingKey.ExternalPathEnabled) {
        setEnabledExternalPath(value);
      }
    }
    Settings.onChange(handleChangeExternalPath);

    return () => Settings.offChange(handleChangeExternalPath);
  }, [])

  // release note
  const [
    {
      show: showReleaseNoteModal,
    },
    {
      showModal: handleClickReleaseNote,
      hideModal: handleHideReleaseNote,
    },
  ] = useDisplayModal();

  // about
  const [
    {
      show: showAboutModal,
    },
    {
      showModal: handleClickAbout,
      hideModal: handleHideAbout,
    },
  ] = useDisplayModal();

  // bookmark
  const [
    {
      show: showBookmarkManagerModal,
    },
    {
      showModal: handleClickBookmarkManager,
      hideModal: handleHideBookmarkManager,
    },
  ] = useDisplayModal();

  // external path
  const [
    {
      show: showExternalPathManagerModal,
    },
    {
      showModal: handleClickExternalPathManager,
      hideModal: handleHideExternalPathManager,
    },
  ] = useDisplayModal();

  // settings
  const [
    {
      show: showSettingsModal,
    },
    {
      showModal: handleClickSettings,
      hideModal: handleHideSettings,
    },
  ] = useDisplayModal();

  // top menu
  const aboutItem: MenuItem = {
    id: "top.about",
    type: MenuItemType.Link,
    iconClassName: "bi bi-info-lg",
    text: (
      <AboutMenuItem
        onHasNew={handleClickAbout}
      />
    ),
    onClick: handleClickAbout,
  };
  const defaultMenuItems: MenuItem[] = [
    aboutItem,
  ];
  const singedInMenuItems: MenuItem[] = [
    {
      id: "top.files",
      type: MenuItemType.Link,
      active: location.pathname.startsWith("/browse"),
      iconClassName: "bi bi-folder-fill me-1",
      text: translate("top.files"),
    },
    {
      id: "top.settings",
      type: MenuItemType.Link,
      iconClassName: "bi bi-gear-fill me-1",
      text: translate("top.settings"),
      onClick: handleClickSettings,
    },
    {
      id: "top.bookmarks",
      type: MenuItemType.Link,
      iconClassName: "bi bi-star-fill me-1",
      text: translate("top.bookmarks"),
      onClick: handleClickBookmarkManager,
    },
    aboutItem,
  ];
  if (enabledExternalPath) {
    singedInMenuItems.splice(1, 0,
      {
        id: "top.externalPath",
        type: MenuItemType.Link,
        active: location.pathname.startsWith("/externalPath"),
        iconClassName: "bi bi-signpost-2-fill me-1",
        text: translate("top.externalPath"),
        onClick: handleClickExternalPathManager,
      });
  }

  return (
    <>
      <Top
        defaultMenuItems={defaultMenuItems}
        singedInMenuItems={singedInMenuItems}
        onClickVersion={handleClickReleaseNote}
      />
      <ReleaseNoteModal
        show={showReleaseNoteModal}
        onHide={handleHideReleaseNote}
      />
      <SettingsModal
        show={showSettingsModal}
        onHide={handleHideSettings}
      />
      <BookmarkManager
        size="lg"
        show={showBookmarkManagerModal}
        onHide={handleHideBookmarkManager}
        onActiveBookmark={onActiveKodoAddress}
      />
      <ExternalPathManager
        size="lg"
        show={showExternalPathManagerModal}
        onHide={handleHideExternalPathManager}
        onActiveExternalPath={onActiveKodoAddress}
      />
      <About
        show={showAboutModal}
        onHide={handleHideAbout}
      />
    </>
  );
};

export default TopMenu;
