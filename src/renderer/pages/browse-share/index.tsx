import React, {useCallback, useEffect, useState} from "react";
import lodash from "lodash";
import {toast} from "react-hot-toast";

import {useAuth} from "@renderer/modules/auth";
import {ADDR_KODO_PROTOCOL} from "@renderer/const/kodo-nav";
import {
  KodoAddress,
  KodoNavigator,
  Provider as KodoNavigatorProvider,
} from "@renderer/modules/kodo-address";
import {useBookmarkPath} from "@renderer/modules/user-config-store";

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

  const {setHome} = useBookmarkPath(currentUser);

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
      lockPrefix: homeAddress.path,
    });
    setKodoNavigator(kodoNav);
    setHome(homeAddress)
      .catch(e=> {
        toast.error(e.toString());
      });
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
