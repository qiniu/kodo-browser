import {ipcRenderer} from "electron";

import React, {useEffect, useMemo} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import {toast} from "react-hot-toast";

import {AkItem, useAuth} from "@renderer/modules/auth";
import {clearAllCache} from "@renderer/modules/qiniu-client";
import {useI18n} from "@renderer/modules/i18n";
import * as AuditLog from "@renderer/modules/audit-log";

import LoadingHolder from "@renderer/components/loading-holder";

import RoutePath from "@renderer/pages/route-path";

const SwitchUser: React.FC = () => {
  const {translate} = useI18n();
  const {currentUser, signIn, signOut} = useAuth();
  const navigate = useNavigate();
  const {
    state: akItem,
  } = useLocation() as {
    state: AkItem,
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
        signOut();
        return signIn(akItem, true);
      })
      .then(() => {
        navigate(RoutePath.Browse);
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
        {akItem.accessKey}<br/>
        {akItem.description?.trim() && `(${akItem.description})`}
      </div>
    </div>
  );
};

export default SwitchUser;
