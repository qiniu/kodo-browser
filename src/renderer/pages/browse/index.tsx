import React, {useEffect, useState} from "react";

import {ADDR_KODO_PROTOCOL} from "@renderer/const/kodo-nav";
import {
  KodoAddress,
  KodoBookmark,
  KodoNavigator,
  Provider as KodoNavigatorProvider
} from "@renderer/modules/kodo-address";
import {useAuth} from "@renderer/modules/auth";

import LoadingHolder from "@renderer/components/loading-holder";
import KodoAddressBar from "@renderer/components/kodo-address-bar";

import Contents from "./contents";
import Transfer from "./transfer";

interface BrowseProps {
  activeKodoAddress?: KodoAddress | null,
}

const Browse: React.FC<BrowseProps> = ({
  activeKodoAddress,
}) => {
  const {currentUser} = useAuth();
  if (!currentUser) {
    return (
      <>not sign in</>
    );
  }

  const [kodoNavigator, setKodoNavigator] = useState<KodoNavigator>();
  const [toggleRefresh, setToggleRefresh] = useState<boolean>(true);

  // initial kodo navigator
  useEffect(() => {
    const kodoBookmark = new KodoBookmark({
      persistPath: `bookmarks_${currentUser.accessKey}.json`,
    });

    setKodoNavigator(new KodoNavigator({
      defaultProtocol: ADDR_KODO_PROTOCOL,
      maxHistory: 100,
      homeItem: kodoBookmark.read().homeAddress,
    }));
  }, []);

  // bookmark go to
  useEffect(() => {
    if (!kodoNavigator || !activeKodoAddress) {
      return;
    }
    kodoNavigator.goTo({
      protocol: activeKodoAddress.protocol,
      path: activeKodoAddress.path,
    });
  }, [activeKodoAddress]);

  if (!kodoNavigator) {
    return (
      <LoadingHolder/>
    );
  }

  return (
    <KodoNavigatorProvider kodoNavigator={kodoNavigator}>
      <KodoAddressBar
        onClickRefresh={() => setToggleRefresh(v => !v)}
      />
      <Contents
        toggleRefresh={toggleRefresh}
      />
      <Transfer
        onRefresh={() => setToggleRefresh(v => !v)}
      />
    </KodoNavigatorProvider>
  );
};

export default Browse;
