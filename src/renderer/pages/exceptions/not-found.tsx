import React, {useEffect} from "react";

import * as LocalLogger from "@renderer/modules/local-logger"

interface NotFoundProps {
  location?: string | Partial<Location>;
}

const NotFound: React.FC<NotFoundProps> = (props) => {
  useEffect(() => {
    LocalLogger.warn("Not Found Page!", props.location);
  }, []);

  return (
    <>
      <div>404 你来到了无牛问津的地方</div>
      <div>{JSON.stringify(props.location)}</div>
    </>
  );
};

export default NotFound;
