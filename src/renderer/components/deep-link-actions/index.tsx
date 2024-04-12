import React from 'react';
import {useNavigate} from "react-router-dom";
import {toast} from "react-hot-toast";

import {useI18n} from "@renderer/modules/i18n";
import {useAuth} from "@renderer/modules/auth";
import useIpcDeepLink from "@renderer/modules/electron-ipc-manages/use-ipc-deep-links";

import ConfirmModal from "@renderer/components/modals/common/confirm-modal";
import {useDisplayModal} from "@renderer/components/modals/hooks";
import RoutePath, {
  ISignInState,
  SignOutState,
  SwitchUserState,
  SwitchUserStateSession
} from "@renderer/pages/route-path";

type ConfirmModalData = {
  navType: "signIn",
  navData: ISignInState["data"],
} | {
  navType: "switchUser",
  navData: SwitchUserStateSession["data"],
} | null;

function DeepLinkActions() {
  const {translate} = useI18n();
  const {currentUser} = useAuth();
  const navigate = useNavigate();

  const navToSignIn = (data: ISignInState["data"]) => {
    const signInState: ISignInState = {
      type: "shareLink",
      data,
    };
    navigate(RoutePath.SignIn, {
      state: signInState,
    });
  };

  const navToSignOut = (signInData: ISignInState["data"]) => {
    const signOutState: SignOutState = {
      type: "signInState",
      data: {
        type: "shareLink",
        data: signInData,
      },
    };
    navigate(RoutePath.SignOut, {
      state: signOutState,
    });
  };

  const navToSwitchUser = (switchUser: SwitchUserStateSession["data"]) => {
    const switchUserState: SwitchUserState = {
      type: "shareSession",
      data: switchUser,
    };
    navigate(RoutePath.SwitchUser, {
      state: switchUserState,
    });
  };

  // modal state
  const [
    {
      show: isSignOutConfirmModal,
      data: confirmData,
    },
    {
      showModal: handleSignOutConfirmModal,
      hideModal: handleCloseSignOutConfirmModal,
    },
  ] = useDisplayModal<ConfirmModalData>(null);
  const handleSignOutConfirmOk = () => {
    if (confirmData?.navType === "signIn") {
      navToSignOut(confirmData.navData);
    } else if (confirmData?.navType === "switchUser") {
      navToSwitchUser(confirmData.navData);
    }
  };

  // use IPC
  useIpcDeepLink({
    onSignInDataInvalid: () => {
      toast.error(translate("deepLinkActions.signIn.invalidParams"));
    },
    onSignInWithShareLink: (data) => {
      const navData: ISignInState["data"] = {
        apiHost: data.apiHost,
        shareId: data.shareId,
        shareToken: data.shareToken,
        extractCode: data.extractCode,
      };

      if (!currentUser) {
        navToSignIn(navData);
        return;
      }

      handleSignOutConfirmModal({
        navType: "signIn",
        navData,
      });
    },
    onSignInWithShareSession: (data) => {
      const navData: SwitchUserStateSession["data"] = {
        akItem: {
          accessKey: data.accessKey,
          accessSecret: data.accessSecret,
          description: data.description,
        },
        session: {
          sessionToken: data.sessionToken,
          endpoint: data.endpoint,
          bucketId: data.bucketId,
          bucketName: data.bucketName,
          expires: data.expires,
          permission: data.permission,
          prefix: data.prefix,
          regionS3Id: data.regionS3Id,
        },
      };

      if (!currentUser) {
        navToSwitchUser(navData);
        return;
      }

      handleSignOutConfirmModal({
        navType: "switchUser",
        navData,
      });
    },
  });

  return (
    <div>
      <ConfirmModal
        show={isSignOutConfirmModal}
        onHide={() => handleCloseSignOutConfirmModal(null)}
        title={translate("deepLinkActions.signIn.signOutConfirm.title")}
        content={translate("deepLinkActions.signIn.signOutConfirm.description")}
        onOk={handleSignOutConfirmOk}
      />
    </div>
  );
}

export default DeepLinkActions;
