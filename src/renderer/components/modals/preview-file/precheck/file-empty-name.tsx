import React, {PropsWithChildren} from "react";

import {BackendMode} from "@common/qiniu";

import {useI18n} from "@renderer/modules/i18n";


interface FileEmptyNameProps {
  fileName: string,
  backendMode: BackendMode,
}

const FileEmptyName: React.FC<PropsWithChildren<FileEmptyNameProps>> = ({
  fileName,
  backendMode,
  children,
}) => {
  const {translate} = useI18n();

  if (backendMode === BackendMode.S3 && !fileName) {
    return (
      <div className="p-1 text-center">
        {translate("modals.preview.error.emptyFileNameByS3Hint")}
      </div>
    );
  }

  return (
    <>
      {children}
    </>
  );
};

export default FileEmptyName;
