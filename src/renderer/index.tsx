import "bootstrap-icons/font/bootstrap-icons.css"
import "./styles/index.scss";

import React from "react";
import {createRoot} from "react-dom/client";
import {MemoryRouter as Router} from "react-router-dom";

import * as appLife from "./app-life";

appLife.beforeStart()
  .then(() => import("./app"))
  .then(({default: App}) => {
    const container = document.getElementById("kodo-browser-app");
    const root = createRoot(container!);
    root.render(
      <Router>
        <App/>
      </Router>,
    );
  });

window.onclose = appLife.beforeQuit;
