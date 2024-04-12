import React, {useCallback, useEffect, useState} from "react";
import lodash from "lodash";

import {ADDR_KODO_PROTOCOL} from "@renderer/const/kodo-nav";
import {
  KodoAddress,
  KodoNavigator,
  Provider as KodoNavigatorProvider,
} from "@renderer/modules/kodo-address";
import {useAuth} from "@renderer/modules/auth";

import LoadingHolder from "@renderer/components/loading-holder";
import KodoAddressBar from "@renderer/components/kodo-address-bar";

import Transfer from "../browse/transfer";
import Contents from "./contents";

interface BrowseShareProps {}

const BrowseShare: React.FC<BrowseShareProps> = () => {
  const {currentUser, shareSession} = useAuth();

  const [kodoNavigator, setKodoNavigator] = useState<KodoNavigator>();
  const [toggleRefresh, setToggleRefresh] = useState<boolean>(true);

  const toggleRefreshThrottled = useCallback(lodash.throttle(() => {
    setToggleRefresh(v => !v);
  }, 300), []);

  // initial kodo navigator
  useEffect(() => {
    if (!currentUser || !shareSession) {
      return;
    }
    const homeAddress: KodoAddress = {
      protocol: ADDR_KODO_PROTOCOL,
      path: `${shareSession.bucketName}/${shareSession.prefix}`,
    }
    const kodoNav = new KodoNavigator({
      defaultProtocol: ADDR_KODO_PROTOCOL,
      maxHistory: 100,
      initAddress: homeAddress,
    });
    setKodoNavigator(kodoNav);
  }, [currentUser]);

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

export default BrowseShare;
