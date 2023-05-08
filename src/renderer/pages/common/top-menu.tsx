import React, {useEffect, useState} from "react";
import {useLocation, useNavigate, useSearchParams} from "react-router-dom";

import {useI18n} from "@renderer/modules/i18n";
import RouterPath from "@renderer/pages/route-path";
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
import {ADDR_KODO_PROTOCOL} from "@renderer/const/kodo-nav";

interface TopMenuProps {
  onActiveKodoAddress: (kodoAddress: BookmarkItem | ExternalPathItem) => void,
}

const TopMenu: React.FC<TopMenuProps> = ({
  onActiveKodoAddress,
}) => {
  const {translate} = useI18n();
  const location = useLocation();
  const [searchParams, _] = useSearchParams();
  const navigate = useNavigate();

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

  // witch between external mode
  const isBrowseWithExternalMode = searchParams.has("external-mode");
  const handleClickFiles = () => {
    if (location.pathname.startsWith(RouterPath.Browse) && !isBrowseWithExternalMode) {
      return;
    }
    navigate(RouterPath.Browse);
    onActiveKodoAddress({
      protocol: ADDR_KODO_PROTOCOL,
      path: "",
      timestamp: 0,
    });
  }

  const handleClickExternalPath = () => {
    if (location.pathname.startsWith(RouterPath.Browse) && isBrowseWithExternalMode) {
      return;
    }
    navigate(RouterPath.Browse);
    onActiveKodoAddress({
      protocol: ADDR_KODO_PROTOCOL,
      path: "",
      regionId: "",
    });
  }

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
      active: location.pathname.startsWith(RouterPath.Browse) && !isBrowseWithExternalMode,
      iconClassName: "bi bi-folder-fill me-1",
      text: translate("top.files"),
      onClick: handleClickFiles,
    },
    {
      id: "top.settings",
      type: MenuItemType.Link,
      className: "ms-auto",
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
        active: location.pathname.startsWith(RouterPath.Browse) && isBrowseWithExternalMode,
        iconClassName: "bi bi-signpost-2-fill me-1",
        text: translate("top.externalPath"),
        onClick: handleClickExternalPath,
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
      <About
        show={showAboutModal}
        onHide={handleHideAbout}
      />
    </>
  );
};

export default TopMenu;
