import {ipcRenderer} from "electron";

import React, {useEffect} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import {toast} from "react-hot-toast";

import {AkItem, useAuth} from "@renderer/modules/auth";
import {clearAllCache} from "@renderer/modules/qiniu-client";
import {useI18n} from "@renderer/modules/i18n";

import LoadingHolder from "@renderer/components/loading-holder";

import RoutePath from "@renderer/pages/route-path";

const SwitchUser: React.FC = () => {
  const {translate} = useI18n();
  const {signIn, signOut} = useAuth();
  const navigate = useNavigate();
  const {
    state: akItem,
  } = useLocation() as {
    state: AkItem,
  };


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
      });
  }, []);

  return (
    <div className="w-100 h-100 d-flex flex-column justify-content-center align-items-center">
      <div>
        <LoadingHolder text={translate("switchUser.title")}/>
      </div>
      <div className="text-secondary">
        ({akItem.description || akItem.accessKey})
      </div>
    </div>
  );
};

export default SwitchUser;
