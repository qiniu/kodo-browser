import React from "react";
import {Button} from "react-bootstrap";
import {useI18n} from "@renderer/modules/i18n";

import {FileItem} from "@renderer/modules/qiniu-client";

interface OthersContentProps {
  onOpenAs: (t: FileItem.FileExtensionType) => void,
}

const OthersContent: React.FC<OthersContentProps> = ({
  onOpenAs,
}) => {
  const {translate} = useI18n();

  return (
    <div className="text-center text-bg-warning bg-opacity-10 p-4">
      {translate("modals.preview.content.others.description")}
      <Button
        variant="lite-primary"
        onClick={() => onOpenAs(FileItem.FileExtensionType.Code)}
      >
        <i className="bi bi-file-earmark-code text-body me-1"/>
        {translate("modals.preview.content.others.openAsText")}
      </Button>
    </div>
  );
};

export default OthersContent;
