import React, {useEffect} from "react";

import * as LocalLogger from "@renderer/modules/local-logger"
import {useI18n} from "@renderer/modules/i18n";

interface NotFoundProps {
  location?: string | Partial<Location>;
}

const NotFound: React.FC<NotFoundProps> = (props) => {
  useEffect(() => {
    LocalLogger.warn("Not Found Page!", props.location);
  }, []);
  const {translate} = useI18n();

  return (
    <>
      <div>404 {translate("common.notFound")}</div>
      <div>{JSON.stringify(props.location)}</div>
    </>
  );
};

export default NotFound;
