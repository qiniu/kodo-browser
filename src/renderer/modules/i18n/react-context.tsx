import React, {createContext, useContext, useState} from "react";

import {translate, getLang, LangName, setLang} from "./core";

// react hooks
const I18nContext = createContext<{
  availableLanguages: LangName[],
  currentLanguage: LangName,
  translate: typeof translate,
  setLanguage: (lang: LangName) => Promise<void>,
}>({
  availableLanguages: Object.values(LangName),
  currentLanguage: LangName.ZH_CN,
  translate: translate,
  setLanguage: async (lang) => {
    await setLang(lang);
  },
});

export const Provider: React.FC<{
  children: React.ReactNode,
}> = ({children}) => {
  const [currentLang, setCurrentLang] = useState(getLang);

  const setLanguage = async (lang: LangName): Promise<void> => {
    await setLang(lang);
    setCurrentLang(lang);
  }

  return (
    <I18nContext.Provider value={{
      availableLanguages: Object.values(LangName),
      currentLanguage: currentLang,
      translate: translate,
      setLanguage,
    }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext);
}
