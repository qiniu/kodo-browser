import React, {useCallback, useEffect, useState} from "react";
import lodash from "lodash";

import {ADDR_KODO_PROTOCOL} from "@renderer/const/kodo-nav";
import {
  BookmarkItem,
  ExternalPathItem,
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
    setKodoNavigator(new KodoNavigator({
      defaultProtocol: ADDR_KODO_PROTOCOL,
      maxHistory: 100,
      initAddress: kodoBookmark.read().homeAddress,
    }));
  }, [currentUser]);

  // bookmark go to
  const [externalRegionId, setExternalRegionId] = useState<string>()
  useEffect(() => {
    if (!kodoNavigator || !activeKodoAddress) {
      return;
    }
    if ("regionId" in activeKodoAddress) {
      setExternalRegionId(activeKodoAddress.regionId);
    } else {
      setExternalRegionId(undefined);
    }
    kodoNavigator.goTo({
      protocol: activeKodoAddress.protocol,
      path: activeKodoAddress.path,
    });
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
        externalRegionId={externalRegionId}
        toggleRefresh={toggleRefresh}
      />
      <Transfer
        onRefresh={toggleRefreshThrottled}
      />
    </KodoNavigatorProvider>
  );
};

export default Browse;
