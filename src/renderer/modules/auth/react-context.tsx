import React, {createContext, useContext, useState} from "react";

import {AkItem} from "./types";
import * as AuthFunc from "./functions";

const AuthContext = createContext<{
  currentUser: AkItem | null,
  akHistory: AkItem[],
  signIn: (akItem: AkItem, remember: boolean) => Promise<void>,
  signOut: () => void,
  deleteHistory: (akItem: AkItem) => void,
  clearHistory: () => void,
}>({
  currentUser: null,
  akHistory: [],
  signIn: AuthFunc.signIn,
  signOut: AuthFunc.signOut,
  deleteHistory: AuthFunc.deleteHistory,
  clearHistory: AuthFunc.clearHistory,
});

export const Provider: React.FC<{
  children: React.ReactNode,
}> = ({children}) => {
  const [user, setUser] = useState<AkItem | null>(AuthFunc.getCurrentUser());
  const [history, setHistory] = useState<AkItem[]>(AuthFunc.getHistory());

  const signIn = async (akItem: AkItem, remember: boolean) => {
    await AuthFunc.signIn(akItem, remember);
    setUser(akItem);
    setHistory([...AuthFunc.getHistory()]);
  };

  const signOut = () => {
    AuthFunc.signOut();
    setUser(null);
  };

  const deleteHistory = (akItem: AkItem) => {
    AuthFunc.deleteHistory(akItem);
    setHistory([...AuthFunc.getHistory()]);
  };

  const clearHistory = () => {
    AuthFunc.clearHistory();
    setHistory([...AuthFunc.getHistory()]);
  };

  return (
    <AuthContext.Provider value={{
      currentUser: user,
      akHistory: history,
      signIn,
      signOut,
      deleteHistory,
      clearHistory,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext);
}
