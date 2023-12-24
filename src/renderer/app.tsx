import React, {useState} from "react";
import {Routes, Route, useLocation} from "react-router-dom";
import {Toaster} from "react-hot-toast";
import {Spinner} from "react-bootstrap";

import {Provider as I18nProvider} from "@renderer/modules/i18n";
import {Provider as AuthProvider} from "@renderer/modules/auth";

import TopMenu from "@renderer/pages/common/top-menu";
import RoutePath from "@renderer/pages/route-path";
import NotFound from "@renderer/pages/exceptions/not-found";
import SignIn from "@renderer/pages/sign-in";
import Browse from "@renderer/pages/browse";
import SignOut from "@renderer/pages/sign-out";
import SwitchUser from "@renderer/pages/switch-user";

import {KodoAddress} from "@renderer/modules/kodo-address";

const App: React.FC = () => {
  const location = useLocation();
  const locationState = location.state as { backgroundLocation?: Location };

  const [activeKodoAddress, setActiveKodoAddress] = useState<KodoAddress | null>(null);

  return (
    <I18nProvider>
      <AuthProvider>
        <TopMenu
          // set a new object to make react rerender
          onActiveKodoAddress={item => setActiveKodoAddress({...item})}
        />
        <Routes location={locationState?.backgroundLocation ?? location}>
          <Route path={RoutePath.Root} element={<SignIn/>}/>
          <Route path={RoutePath.SignIn} element={<SignIn/>}/>
          <Route path={RoutePath.SignOut} element={<SignOut/>}/>
          <Route path={RoutePath.SwitchUser} element={<SwitchUser/>}/>
          <Route path={RoutePath.Browse} element={
            <Browse activeKodoAddress={activeKodoAddress}/>
          }/>
          <Route path="*" element={<NotFound/>}/>
        </Routes>
        <Toaster
          position="bottom-left"
          reverseOrder={false}
          toastOptions={{
            className: "hot-toast",
            loading: {
              icon: (<Spinner animation="border" size="sm"/>),
            },
            success: {
              // TODO: alert-success style is overwritten
              className: "hot-toast alert-success",
              iconTheme: {
                primary: "var(--bs-success)",
                secondary: "var(--bs-light)",
              },
            },
            error: {
              // TODO: alert-danger style is overwritten
              className: "hot-toast alert-danger",
              iconTheme: {
                primary: "var(--bs-danger)",
                secondary: "var(--bs-light)",
              },
            },
          }}
        />
      </AuthProvider>
    </I18nProvider>
  );
}

export default App
