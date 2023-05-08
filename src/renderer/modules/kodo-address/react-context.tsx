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
  goUp: KodoNavigator["goUp"],
  goTo: KodoNavigator["goTo"],
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
  goTo: (_kodoAddress: Partial<KodoAddress>) => {},
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
    const handleChange = () => {
      setCurrentAddress(kodoNavigator.current);
      setCurrentIndex(kodoNavigator.currentIndex);
      setAddressHistory(kodoNavigator.history);
      setBucketName(kodoNavigator.bucketName);
      setBasePath(kodoNavigator.basePath);
    };
    kodoNavigator.onChange(handleChange);
    return () => kodoNavigator.offChange(handleChange);
  }, [kodoNavigator]);

  return (
    <KodoNavigatorContext.Provider value={{
      currentAddress: currentAddress,
      currentIndex: currentIndex,
      addressHistory: addressHistory,
      bucketName: bucketName,
      basePath: basePath,
      // `bind` are required because of `this`
      goBack: kodoNavigator.goBack.bind(kodoNavigator),
      goForward: kodoNavigator.goForward.bind(kodoNavigator),
      goUp: kodoNavigator.goUp.bind(kodoNavigator),
      goTo: kodoNavigator.goTo.bind(kodoNavigator),
    }}>
      {children}
    </KodoNavigatorContext.Provider>
  );
}

export function useKodoNavigator() {
  return useContext(KodoNavigatorContext);
}
