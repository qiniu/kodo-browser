import "bootstrap-icons/font/bootstrap-icons.css";
import "font-awesome/css/font-awesome.css";
import "react-base-table/styles.css";

import "./styles/index.scss";

import React from "react";
import {createRoot} from "react-dom/client";
import {MemoryRouter as Router} from "react-router-dom";

// create a RoutePath.Root page and check auth state will be more beautiful
import {getCurrentUser} from "./modules/auth";
import {getEndpointConfig} from "./modules/user-config-store";

import setupApp from "./setup-app";
import RoutePath from "./pages/route-path";

(async function () {
  await setupApp();
  const {default: App} = await import("./app");
  const container = document.createElement("div");
  container.id = "kodo-browser-app";
  container.className = "h-100";
  document.body.prepend(container);
  const root = createRoot(container);
  const currentUser = getCurrentUser();
  const isSignedIn = currentUser !== null;
  if (isSignedIn) {
    await getEndpointConfig(currentUser).loadFromPersistence();
  }
  root.render(
    <Router initialEntries={[isSignedIn ? RoutePath.Browse : RoutePath.SignIn]}>
      <App/>
    </Router>,
  );
})();
