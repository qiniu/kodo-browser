import React, {KeyboardEventHandler, useEffect, useState} from "react";
import {InputGroup, Form} from "react-bootstrap";
import {toast} from "react-hot-toast";

import {useI18n} from "@renderer/modules/i18n";
import {useAuth} from "@renderer/modules/auth";
import {KodoAddress, KodoNavigator, useKodoNavigator} from "@renderer/modules/kodo-address";

import TooltipButton from "@renderer/components/tooltip-button";
import {useKodoBookmark} from "@renderer/modules/kodo-address/react-hooks";

interface KodoAddressBarProps {
  onClickRefresh: () => void,
}

const KodoAddressBar: React.FC<KodoAddressBarProps> = ({
  onClickRefresh,
}) => {
  const {translate} = useI18n();
  const {currentUser} = useAuth();

  const {
    currentAddress,
    addressHistory,
    currentIndex,
    goBack,
    goForward,
    goTo,
  } = useKodoNavigator();

  const [address, setAddress] = useState<KodoAddress>(currentAddress);
  useEffect(() => {
    if (!currentAddress) {
      return;
    }
    setAddress(currentAddress);
  }, [currentAddress]);

  const {
    bookmarkState: {
      homeAddress,
      list: bookmarks,
    },
    setHome,
    deleteBookmark,
    addBookmark,
  } = useKodoBookmark(currentUser);

  const isActiveBookmark = bookmarks.some(b =>
    b.protocol === address.protocol &&
    b.path === address.path
  );

  // handlers
  const handleSubmitAddress: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.code !== "Enter") {
      return;
    }
    let path = e.target.value;
    const [bucketName] = path.split("/", 1);
    const key = path.slice(`${bucketName}/`.length)
    goTo({
      path: !bucketName ? "" : `${bucketName}/${key}`,
    });
  }

  // render
  return (
    <div className="m-1">
      <InputGroup size="sm">
        <TooltipButton
          disabled={currentIndex === 0}
          iconClassName="fa fa-arrow-left"
          tooltipPlacement="right"
          tooltipContent={translate("kodoAddressBar.goBack")}
          onClick={goBack}
        />
        <TooltipButton
          disabled={currentIndex === (addressHistory.length - 1)}
          iconClassName="fa fa-arrow-right"
          tooltipPlacement="bottom"
          tooltipContent={translate("kodoAddressBar.goForward")}
          onClick={goForward}
        />
        <TooltipButton
          disabled={address.path.length === 0}
          iconClassName="fa fa-arrow-up"
          tooltipPlacement="bottom"
          tooltipContent={translate("kodoAddressBar.goUp")}
          onClick={() => {
            const baseDirPath = KodoNavigator.getBaseDir(address.path);
            if (currentAddress.path === baseDirPath) {
              setAddress(currentAddress);
              return;
            }
            goTo({
              path: baseDirPath,
            });
          }}
        />
        <TooltipButton
          iconClassName="fa fa-refresh"
          tooltipPlacement="bottom"
          tooltipContent={translate("kodoAddressBar.refresh")}
          onClick={onClickRefresh}
        />
        <TooltipButton
          iconClassName="fa fa-home"
          tooltipPlacement="bottom"
          tooltipContent={translate("kodoAddressBar.goHome")}
          onClick={() => goTo(homeAddress)}
        />
        <InputGroup.Text>
          {address.protocol}
        </InputGroup.Text>
        <Form.Control
          value={address.path}
          onChange={e => {
            setAddress({
              ...address,
              path: e.target.value,
            })
          }}
          onKeyUp={handleSubmitAddress}
          aria-label="Kodo Navigator Input"
        />
        <TooltipButton
          iconClassName="fa fa-bookmark"
          tooltipPlacement="bottom"
          tooltipContent={translate("kodoAddressBar.setHome")}
          onClick={() => {
            setHome(address);
            toast.success(translate("kodoAddressBar.setHomeSuccess"))
          }}
        />
        <TooltipButton
          iconClassName={
            isActiveBookmark
              ? "bi bi-star-fill text-yellow"
              : "bi bi-star"
          }
          tooltipPlacement="left"
          tooltipContent={
            isActiveBookmark
              ? translate("kodoAddressBar.deleteBookmark")
              : translate("kodoAddressBar.setBookmark")
          }
          onClick={() => {
            if (isActiveBookmark) {
              deleteBookmark(address);
              toast.success(translate("kodoAddressBar.deleteBookmarkSuccess"));
            } else {
              addBookmark(address);
              toast.success(translate("kodoAddressBar.setBookmarkSuccess"));
            }
          }}
        />
      </InputGroup>
    </div>
  )
};

export default KodoAddressBar;
