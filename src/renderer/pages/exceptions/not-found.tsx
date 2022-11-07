import React, {useEffect} from "react";
import {useLocation} from "react-router-dom";

import * as LocalLogger from "@renderer/modules/local-logger"
import {useI18n} from "@renderer/modules/i18n";

const NotFound: React.FC = () => {
  const {translate} = useI18n();
  let location = useLocation();

  useEffect(() => {
    LocalLogger.warn("Not Found Page!", location);
  }, []);

  return (
    <>
      <div>404 {translate("common.notFound")}</div>
      <div>{JSON.stringify(location)}</div>
    </>
  );
};

export default NotFound;
