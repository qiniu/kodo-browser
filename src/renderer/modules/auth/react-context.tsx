import React, {createContext, useContext, useState} from "react";

import {AkItem, ShareSession} from "./types";
import * as AuthFunc from "./functions";

const AuthContext = createContext<{
  currentUser: AkItem | null,
  shareSession: ShareSession | null,
  akHistory: AkItem[],
  signIn: typeof AuthFunc.signIn,
  signInWithShareLink: typeof AuthFunc.signInWithShareLink,
  signInWithShareSession: typeof AuthFunc.signInWithShareSession,
  signOut: typeof AuthFunc.signOut,
  deleteHistory: typeof AuthFunc.deleteHistory,
  clearHistory: typeof AuthFunc.clearHistory,
}>({
  currentUser: null,
  shareSession: null,
  akHistory: [],
  signIn: AuthFunc.signIn,
  signInWithShareLink: AuthFunc.signInWithShareLink,
  signInWithShareSession: AuthFunc.signInWithShareSession,
  signOut: AuthFunc.signOut,
  deleteHistory: AuthFunc.deleteHistory,
  clearHistory: AuthFunc.clearHistory,
});

export const Provider: React.FC<{
  children: React.ReactNode,
}> = ({children}) => {
  const [user, setUser] = useState<AkItem | null>(AuthFunc.getCurrentUser());
  const [history, setHistory] = useState<AkItem[]>(AuthFunc.getHistory());
  const [shareSession, setShareSession] = useState<ShareSession | null>(AuthFunc.getShareSession());

  const signIn = async (akItem: AkItem, remember: boolean) => {
    await AuthFunc.signIn(akItem, remember);
    setUser(akItem);
    setHistory([...AuthFunc.getHistory()]);
  };

  const signInWithShareLink = async (opt: AuthFunc.SignInWithShareLinkOptions) => {
    await AuthFunc.signInWithShareLink(opt);
    setUser(AuthFunc.getCurrentUser());
    setShareSession(AuthFunc.getShareSession());
  }

  const signInWithShareSession = async (opt: AuthFunc.SignInWithShareSessionOptions) => {
    await AuthFunc.signInWithShareSession(opt);
    setUser(AuthFunc.getCurrentUser());
    setShareSession(AuthFunc.getShareSession());
  }

  const signOut = async () => {
    await AuthFunc.signOut();
    setUser(null);
    setShareSession(null);
  };

  const deleteHistory = async (akItem: AkItem) => {
    await AuthFunc.deleteHistory(akItem);
    setHistory([...AuthFunc.getHistory()]);
  };

  const clearHistory = async () => {
    await AuthFunc.clearHistory();
    setHistory([...AuthFunc.getHistory()]);
  };

  return (
    <AuthContext.Provider value={{
      currentUser: user,
      shareSession,
      akHistory: history,
      signIn,
      signInWithShareLink,
      signInWithShareSession,
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
