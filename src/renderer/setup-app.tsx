import React, {useEffect, useState} from "react";
import {createRoot} from "react-dom/client";

import {Alert, Spinner} from "react-bootstrap";

import {app} from "@common/const/app-config"

import * as appLife from "./app-life";

interface SetupAppProps {
  resolve: () => void,
  reject: (err: Error) => void,
}

const SetupApp: React.FC<SetupAppProps> = ({
  resolve,
  reject,
}) => {
  const [err, setErr] = useState<Error>();

  useEffect(() => {
    appLife.beforeStart()
      .then(resolve)
      .catch(e => {
        setErr(e);
        reject(e);
      });
  }, []);

  if (err) {
    return (
      <div
        className="d-flex justify-content-center align-items-center w-100 h-100 p-5"
      >
        <Alert variant="danger">
          <Alert.Heading>
            Error! (v{app.version})
          </Alert.Heading>
          <p>{err.message}</p>
          <pre style={{whiteSpace: "pre-wrap"}}>{err.stack}</pre>
        </Alert>
      </div>
    );
  }

  return (
    <div
      className="d-flex justify-content-center align-items-center w-100 h-100"
    >
      <Spinner animation="border" variant="primary"/>
      <div className="p-1">
        Loading......
      </div>
    </div>
  );
}


export default async function setupApp() {
  const container = document.createElement("div");
  container.className = "h-100";
  document.body.prepend(container);
  const root = createRoot(container);
  await new Promise<void>((resolve, reject) => {
    root.render(
      <SetupApp resolve={resolve} reject={reject}/>
    );
  });
  root.unmount();
  container.remove();
  window.onclose = appLife.beforeQuit;
}
