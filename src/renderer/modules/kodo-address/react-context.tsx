import React, {createContext, useContext, useEffect, useState} from "react";

import {KodoAddress} from "./types";
import {KodoNavigator} from "./navigator";

const KodoNavigatorContext = createContext<{
  currentAddress: KodoAddress,
  currentIndex: number,
  addressHistory: KodoAddress[],
  bucketName: string | undefined,
  basePath: string | undefined,
  goBack: () => void,
  goForward: () => void,
  goUp: (p?: KodoAddress) => void,
  goHome: () => void,
  goTo: (kodoAddress: KodoAddress) => void,
  setHome: (home: KodoAddress) => void,
}>({
  currentAddress: {
    protocol: "",
    path: "",
  },
  currentIndex: 0,
  addressHistory: [],
  bucketName: undefined,
  basePath: undefined,
  goBack: () => {},
  goForward: () => {},
  goUp: (_p?: KodoAddress) => {},
  goHome: () => {},
  goTo: (_kodoAddress: KodoAddress) => {},
  setHome: (_home: KodoAddress) => {},
});

export const Provider: React.FC<{
  kodoNavigator: KodoNavigator,
  children: React.ReactNode,
}> = ({
  kodoNavigator,
  children,
}) => {
  const [currentAddress, setCurrentAddress] = useState<KodoAddress>(kodoNavigator.current);
  const [currentIndex, setCurrentIndex] = useState<number>(kodoNavigator.currentIndex);
  const [addressHistory, setAddressHistory] = useState<KodoAddress[]>(kodoNavigator.history);
  const [bucketName, setBucketName] = useState<string | undefined>(kodoNavigator.bucketName);
  const [basePath, setBasePath] = useState<string | undefined>(kodoNavigator.basePath);

  useEffect(() => {
    kodoNavigator.onChange(() => {
      setCurrentAddress(kodoNavigator.current);
      setCurrentIndex(kodoNavigator.currentIndex);
      setAddressHistory(kodoNavigator.history);
      setBucketName(kodoNavigator.bucketName);
      setBasePath(kodoNavigator.basePath);
    });
  }, []);

  return (
    <KodoNavigatorContext.Provider value={{
      currentAddress: currentAddress,
      currentIndex: currentIndex,
      addressHistory: addressHistory,
      bucketName: bucketName,
      basePath: basePath,
      goBack: () => kodoNavigator.goBack(),
      goForward: () => kodoNavigator.goForward(),
      goUp: (...args) => kodoNavigator.goUp(...args),
      goHome: () => kodoNavigator.goHome(),
      goTo: (...args) => kodoNavigator.goTo(...args),
      setHome: (...args) => kodoNavigator.setHome(...args),
    }}>
      {children}
    </KodoNavigatorContext.Provider>
  );
}

export function useKodoNavigator() {
  return useContext(KodoNavigatorContext);
}
