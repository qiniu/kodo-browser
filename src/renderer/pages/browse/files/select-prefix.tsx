import React, {useMemo} from "react";
import {Button} from "react-bootstrap";
import * as qiniuPathConvertor from "qiniu-path/dist/src/convert";

import {useI18n} from "@renderer/modules/i18n";
import {useKodoNavigator} from "@renderer/modules/kodo-address";
import {FileItem} from "@renderer/modules/qiniu-client";

interface SelectPrefixProps {
  selectedFiles: FileItem.Item[],
  onSelectPrefixes: (prefixes: FileItem.Prefix[], checked: boolean) => void,
}

const SelectPrefix: React.FC<SelectPrefixProps> = ({
  selectedFiles,
  onSelectPrefixes,
}) => {
  const {translate} = useI18n();
  const {bucketName, currentAddress} = useKodoNavigator();

  const currentPrefix = useMemo(() => {
    if (!bucketName) {
      return undefined;
    }
    return currentAddress.path.slice(`${bucketName}/`.length);
  }, [currentAddress.path, bucketName]);

  if (!bucketName || currentPrefix === undefined) {
    return null;
  }

  const prefix: FileItem.Prefix = {
    bucket: bucketName,
    name: currentPrefix.slice(currentPrefix.lastIndexOf('/')),
    path: qiniuPathConvertor.fromQiniuPath(currentPrefix),
    itemType: FileItem.ItemType.Prefix,
  };

  const {
    // the selected prefix is including current prefix
    isIncluding,
    // the selected prefix is current prefix
    isSelected,
  } = selectedFiles.reduce((res, i) => {
    if (!FileItem.isItemPrefix(i)) {
      return res;
    }
    const p = i.path.toString();
    if (currentPrefix.startsWith(p)) {
      res.isIncluding = true;
    }
    if (currentPrefix === p) {
      res.isSelected = true;
    }
    return res;
  }, {
    isIncluding: false,
    isSelected: false,
  })

  if (isIncluding) {
    return (
      <div className="mb-1 d-flex justify-content-center align-items-center">
        {translate("browse.fileToolbar.selectPrefix.selected")}
        {
          isSelected &&
          <Button
            variant="link-primary"
            onClick={() => onSelectPrefixes([prefix], false)}
          >
            {translate("browse.fileToolbar.selectPrefix.clear")}
          </Button>
        }
      </div>
    );
  }

  return (
    <div className="mb-1 d-flex justify-content-center align-items-center">
      <Button
        variant="link-primary"
        onClick={() => onSelectPrefixes([prefix], true)}
      >
        {translate("browse.fileToolbar.selectPrefix.select")}
      </Button>
    </div>
  );
};

export default SelectPrefix;
