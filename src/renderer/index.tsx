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

(async function () {
  let err: Error | null = null;
  let errExit = false;
  try {
    await appLife.beforeStart();
  } catch (e) {
    errExit = confirm("Some error happened. Would you like to stop?");
    err = e as Error;
    console.error(e);
  }
  if (errExit) {
    if (err) {
      const p = document.createElement('p');
      p.textContent = [
        err.name,
        err.message,
        err.stack,
        err.cause,
      ].join("\n");
      document.body.appendChild(p);
    }
    return;
  }
  const {default: App} = await import("./app");
  const container = document.getElementById("kodo-browser-app");
  const root = createRoot(container!);
  const isSignedIn = Boolean(getCurrentUser());
  root.render(
    <Router initialEntries={[isSignedIn ? RoutePath.Browse : RoutePath.SignIn]}>
      <App/>
    </Router>,
  );
})()


window.onclose = appLife.beforeQuit;
