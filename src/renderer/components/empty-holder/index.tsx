import React from "react";

import {useI18n} from "@renderer/modules/i18n";

const EmptyHolder: React.FC = () => {
  const {translate} = useI18n();

  return (
    <div className="text-center text-muted">
      {translate("common.empty")}
    </div>
  );
};

export default EmptyHolder;
