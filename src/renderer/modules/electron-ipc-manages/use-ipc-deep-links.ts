import {ipcRenderer, IpcRendererEvent} from "electron";

import {
  DeepLinkMessage,
  DeepLinkAction,
  DeepLinkSignInWithShareLinkMessage,
  DeepLinkSignInWithShareSessionMessage,
  DeepLinkActionFns
} from "@common/ipc-actions/deep-link";
import {useEffect, useRef} from "react";

// TODO: refactor other managers. make them hooks style.

interface useIpcDeepLinkProps {
  onSignInDataInvalid: () => void,
  onSignInWithShareLink: (data: DeepLinkSignInWithShareLinkMessage["data"]) => void,
  onSignInWithShareSession: (data: DeepLinkSignInWithShareSessionMessage["data"]) => void,
}

let DEEP_LINK_CHANNEL = "DeepLink";
let rendererReady = 0;

function useIpcDeepLink({
  onSignInDataInvalid,
  onSignInWithShareLink,
  onSignInWithShareSession,
}: useIpcDeepLinkProps) {
  const uploadReplyHandler = (_event: IpcRendererEvent, message: DeepLinkMessage) => {
    switch (message.action) {
      case DeepLinkAction.SignInDataInvalid:
        onSignInDataInvalid();
        break;
      case DeepLinkAction.SignInWithShareLink:
        onSignInWithShareLink(message.data);
        break;
      case DeepLinkAction.SignInWithShareSession:
        onSignInWithShareSession(message.data);
        break;
    }
  };

  const uploadReplyHandlerRef = useRef(uploadReplyHandler);
  uploadReplyHandlerRef.current = uploadReplyHandler;

  useEffect(() => {
    const handler = (event: Electron.IpcRendererEvent, msg: any) => {
      uploadReplyHandlerRef.current(event, msg);
    }
    ipcRenderer.on(DEEP_LINK_CHANNEL, handler);
    if (!rendererReady) {
      const deepLinkActionFns = new DeepLinkActionFns(ipcRenderer, DEEP_LINK_CHANNEL);
      deepLinkActionFns.rendererReady();
    }
    rendererReady += 1;

    return () => {
      rendererReady -= 1;
      if (!rendererReady) {
        const deepLinkActionFns = new DeepLinkActionFns(ipcRenderer, DEEP_LINK_CHANNEL);
        deepLinkActionFns.rendererClose();
      }
      ipcRenderer.off(DEEP_LINK_CHANNEL, handler);
    }
  }, []);
}

export default useIpcDeepLink;
