import {ipcRenderer} from "electron";

import React, {useEffect, useMemo} from "react";
import {useNavigate} from "react-router-dom";

import {useAuth} from "@renderer/modules/auth";
import {clearAllCache} from "@renderer/modules/qiniu-client";
import {useI18n} from "@renderer/modules/i18n";

import LoadingHolder from "@renderer/components/loading-holder";
import * as AuditLog from "@renderer/modules/audit-log";

import RoutePath from "@renderer/pages/route-path";

const SignOut: React.FC = () => {
  const {translate} = useI18n();
  const {currentUser, signOut} = useAuth();
  const navigate = useNavigate();

  const memoCurrentUser = useMemo(() => currentUser, []);

  useEffect(() => {
    clearAllCache();

    ipcRenderer.send('asynchronous', {key: "signOut"});
    new Promise(resolve => {
      // make sure work cleared.
      setTimeout(resolve, 2300);
    })
      .then(() => {
        signOut();
        navigate(RoutePath.SignIn);
        AuditLog.log(AuditLog.Action.Logout, {
          from: memoCurrentUser?.accessKey ?? "",
        })
      });
  }, []);

  return (
    <LoadingHolder text={translate("signOut.title")}/>
  );
};

export default SignOut;
