import {ipcRenderer} from "electron";

import React, {useEffect, useMemo} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import {toast} from "react-hot-toast";

import {useAuth} from "@renderer/modules/auth";
import {clearAllCache} from "@renderer/modules/qiniu-client";
import {useI18n} from "@renderer/modules/i18n";
import * as AuditLog from "@renderer/modules/audit-log";

import LoadingHolder from "@renderer/components/loading-holder";

import RoutePath, {SwitchUserState} from "@renderer/pages/route-path";

const SwitchUser: React.FC = () => {
  const {translate} = useI18n();
  const {currentUser, signIn, signOut, signInWithShareSession} = useAuth();
  const navigate = useNavigate();
  const {
    state: routeState,
  } = useLocation() as {
    state: SwitchUserState,
  };
  const memoCurrentUser = useMemo(() => currentUser, []);

  useEffect(() => {
    clearAllCache();

    ipcRenderer.send('asynchronous', {key: "signOut"});

    new Promise(resolve => {
      // make sure work cleared.
      setTimeout(resolve, 2500);
    })
      .then(() => {
        return signOut();
      })
      .then(() => {
        switch (routeState?.type) {
          case "ak":
            return signIn(routeState.data.akItem, true);
          case "shareSession":
            return signInWithShareSession(routeState.data);
        }
        return;
      })
      .then(() => {
        switch (routeState?.type) {
          case "ak":
            navigate(RoutePath.Browse);
            break;
          case "shareSession":
            navigate(RoutePath.BrowseShare);
            break;
        }
      })
      .catch(err => {
        toast.error(translate("switchUser.error") + err.toString());
        navigate(RoutePath.SignIn);
      })
      .finally(() => {
        AuditLog.log(AuditLog.Action.SwitchAccount, {
          from: memoCurrentUser?.accessKey ?? "",
        });
      });
  }, []);

  return (
    <div className="w-100 h-100 d-flex flex-column justify-content-center align-items-center">
      <div>
        <LoadingHolder text={translate("switchUser.title")}/>
      </div>
      <div className="text-secondary text-center">
        {routeState?.data.akItem.accessKey}<br/>
        {routeState?.data.akItem.description?.trim() && `(${routeState.data.akItem.description})`}
      </div>
    </div>
  );
};

export default SwitchUser;
