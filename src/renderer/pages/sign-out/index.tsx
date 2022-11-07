import {ipcRenderer} from "electron";

import React, {useEffect} from "react";
import {useNavigate} from "react-router-dom";

import {useAuth} from "@renderer/modules/auth";
import {clearAllCache} from "@renderer/modules/qiniu-client";
import {useI18n} from "@renderer/modules/i18n";

import LoadingHolder from "@renderer/components/loading-holder";

import RoutePath from "@renderer/pages/route-path";

const SignOut: React.FC = () => {
  const {translate} = useI18n();
  const {signOut} = useAuth();
  const navigate = useNavigate();

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
      });
  }, []);

  return (
    <LoadingHolder text={translate("signOut.title")}/>
  );
};

export default SignOut;
