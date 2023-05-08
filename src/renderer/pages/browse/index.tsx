import React, {useCallback, useEffect, useState} from "react";
import {useSearchParams} from "react-router-dom";
import lodash from "lodash";

import {ADDR_KODO_PROTOCOL} from "@renderer/const/kodo-nav";
import {
  BookmarkItem,
  ExternalPathItem, isExternalPathItem,
  KodoAddress,
  KodoBookmark,
  KodoNavigator,
  Provider as KodoNavigatorProvider,
} from "@renderer/modules/kodo-address";
import {useAuth} from "@renderer/modules/auth";

import LoadingHolder from "@renderer/components/loading-holder";
import KodoAddressBar from "@renderer/components/kodo-address-bar";

import Contents from "./contents";
import Transfer from "./transfer";

interface BrowseProps {
  activeKodoAddress?: BookmarkItem | ExternalPathItem | null,
}

const Browse: React.FC<BrowseProps> = ({
  activeKodoAddress,
}) => {
  const [_, setSearchParams] = useSearchParams();

  const {currentUser} = useAuth();

  const [kodoNavigator, setKodoNavigator] = useState<KodoNavigator>();
  const [toggleRefresh, setToggleRefresh] = useState<boolean>(true);

  const toggleRefreshThrottled = useCallback(lodash.throttle(() => {
    setToggleRefresh(v => !v);
  }, 300), []);

  // initial kodo navigator
  useEffect(() => {
    if (!currentUser) {
      return;
    }
    const kodoBookmark = new KodoBookmark({
      persistPath: `bookmarks_${currentUser.accessKey}.json`,
    });
    const kodoNav = new KodoNavigator({
      defaultProtocol: ADDR_KODO_PROTOCOL,
      maxHistory: 100,
      initAddress: kodoBookmark.read().homeAddress,
    });
    const handleChangeKodoNav = ({
      current,
    }: {
      current: KodoAddress,
    }) => {
      if (isExternalPathItem(current)) {
        setSearchParams({"external-mode": "true"});
      } else {
        setSearchParams({});
      }
    }
    kodoNav.onChange(handleChangeKodoNav);
    setKodoNavigator(kodoNav);

    return () => {
      kodoNav.offChange(handleChangeKodoNav);
    };
  }, [currentUser]);

  // bookmark go to
  useEffect(() => {
    if (!kodoNavigator || !activeKodoAddress) {
      return;
    }
    kodoNavigator.goTo(activeKodoAddress, true);
  }, [activeKodoAddress]);

  // render
  if (!currentUser) {
    return (
      <>not sign in</>
    );
  }

  if (!kodoNavigator) {
    return (
      <LoadingHolder/>
    );
  }

  return (
    <KodoNavigatorProvider kodoNavigator={kodoNavigator}>
      <KodoAddressBar
        onClickRefresh={toggleRefreshThrottled}
      />
      <Contents
        toggleRefresh={toggleRefresh}
      />
      <Transfer
        onRefresh={toggleRefreshThrottled}
      />
    </KodoNavigatorProvider>
  );
};

export default Browse;
