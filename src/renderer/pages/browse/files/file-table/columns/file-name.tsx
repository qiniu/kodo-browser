import React, {useEffect} from "react";
import classNames from "classnames";
import {Spinner} from "react-bootstrap";

import Duration from "@common/const/duration";

import {useI18n} from "@renderer/modules/i18n";
import {useAuth} from "@renderer/modules/auth";
import {FileItem} from "@renderer/modules/qiniu-client";
import useFrozenInfo from "@renderer/modules/qiniu-client-hooks/use-frozen-info";
import {useFileOperation} from "@renderer/modules/file-operation";

import TooltipText from "@renderer/components/tooltip-text";

import {RowCellDataProps} from "../../types";

type RestoreStatus =
  "Normal"
  | "Frozen"
  | "Unfreezing"
  | "Unfrozen";

type RestoreI18nKey =
  "browse.restoreStatus.normal"
  | "browse.restoreStatus.frozen"
  | "browse.restoreStatus.unfreezing"
  | "browse.restoreStatus.unfrozen";

const Restore2I18nKey: Record<RestoreStatus, RestoreI18nKey> = {
  "Normal": "browse.restoreStatus.normal",
  "Frozen": "browse.restoreStatus.frozen",
  "Unfreezing": "browse.restoreStatus.unfreezing",
  "Unfrozen": "browse.restoreStatus.unfrozen",
};

const FileTooltip: React.FC<RowCellDataProps> = ({
  rowData: file,
  cellData: fileName,
}) => {
  const {translate} = useI18n();
  const {currentUser} = useAuth();
  const {bucketPreferBackendMode: preferBackendMode} = useFileOperation();

  const {
    frozenInfo,
    fetchFrozenInfo,
  } = useFrozenInfo({
    user: currentUser,
    regionId: file.regionId,
    bucketName: file.bucket,
    filePath: file.path.toString(),
    preferBackendMode,
  });

  const canRestore = FileItem.isItemFile(file) && ["Archive", "DeepArchive"].includes(file.storageClass);

  useEffect(() => {
    if (canRestore) {
      fetchFrozenInfo();
    }
  }, [canRestore]);

  return (
    <>
      <div className="text-start">{fileName}</div>
      {
        canRestore &&
        <div className="text-start text-info">
          {translate("browse.restoreStatus.label")}
          {
            frozenInfo.isLoading
              ? <Spinner className="me-1" animation="border" size="sm"/>
              : frozenInfo.status && translate(Restore2I18nKey[frozenInfo.status])
          }
        </div>
      }
    </>
  );
};

export interface FileNameCellCallbackProps {
  onClickFile: (file: FileItem.Item) => void,
  onDoubleClickFile: (file: FileItem.Item) => void,
}

const FileName: React.FC<RowCellDataProps & FileNameCellCallbackProps> = ({
  rowData: file,
  cellData: fileName,
  onClickFile,
  onDoubleClickFile,
}) => (
  <span
    tabIndex={0}
    className="text-link overflow-ellipsis"
    // style={{
    //   ["--line-num" as any]: 3,
    // }}
    onKeyUp={e => {
      if (e.code === "Space") {
        e.stopPropagation();
        onDoubleClickFile(file);
      }
      if (e.code === "Enter") {
        e.stopPropagation();
        onClickFile(file);
      }
    }}
    onClick={e => {
      e.stopPropagation();
      onClickFile(file);
    }}
    onDoubleClick={e => {
      e.stopPropagation();
      onDoubleClickFile(file);
    }}
  >
    <i
      className={classNames(
        "me-1 text-decoration-none",
        FileItem.getFileIconClassName(file),
        FileItem.isItemFolder(file) ? "text-yellow" : "text-body",
      )}
    />
    <TooltipText
      delay={{
        show: Duration.Second,
        hide: 0,
      }}
      tooltipContent={<FileTooltip rowData={file} cellData={fileName}/>}
    >
      <span>{fileName}</span>
    </TooltipText>
  </span>
);

export default FileName;
