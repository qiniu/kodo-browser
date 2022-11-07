import "bootstrap-icons/font/bootstrap-icons.css";
import "font-awesome/css/font-awesome.css";
import "react-base-table/styles.css";

import "./styles/index.scss";

import React from "react";
import {createRoot} from "react-dom/client";
import {MemoryRouter as Router} from "react-router-dom";

// create a RoutePath.Root page and check auth state will be more beautiful
import {getCurrentUser} from "./modules/auth";

import * as appLife from "./app-life";
import RoutePath from "./pages/route-path";

appLife.beforeStart()
  .then(() => import("./app"))
  .then(({default: App}) => {
    const container = document.getElementById("kodo-browser-app");
    const root = createRoot(container!);
    const isSignedIn = getCurrentUser() !== null;
    root.render(
      <Router initialEntries={[isSignedIn ? RoutePath.Browse : RoutePath.SignIn]}>
        <App/>
      </Router>,
    );
  });

window.onclose = appLife.beforeQuit;
