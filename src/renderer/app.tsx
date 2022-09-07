import React from "react";
import {Routes, Route, useLocation} from "react-router-dom";
import {Toaster} from "react-hot-toast";
import {Spinner} from "react-bootstrap";

import {Provider as I18nProvider} from "@renderer/modules/i18n";

import Top from "@renderer/components/top";

import NotFound from "@renderer/pages/exceptions/not-found";

const App: React.FC = () => {
  const location = useLocation();
  const state = location.state as { backgroundLocation?: Location };

  return (
    <I18nProvider>
      <Top/>
      <Routes location={state?.backgroundLocation ?? location}>
        <Route path="*" element={<NotFound location={location}/>}/>
      </Routes>
      <Toaster
        position="bottom-left"
        reverseOrder={false}
        toastOptions={{
          loading: {
            icon: (<Spinner animation="border" size="sm"/>),
          },
          success: {
            className: "border border-success text-success",
            iconTheme: {
              primary: "var(--bs-success)",
              secondary: "var(--bs-light)",
            },
          },
          error: {
            className: "border border-error text-error",
            iconTheme: {
              primary: "var(--bs-danger)",
              secondary: "var(--bs-light)",
            },
          },
        }}
      />
    </I18nProvider>
  );
}

export default App
