import React, {useEffect, useState} from "react";
import {toast} from "react-hot-toast";
import {Region} from "kodo-s3-adapter-sdk";

import {useI18n} from "@renderer/modules/i18n";
import {useAuth} from "@renderer/modules/auth";
import {useExternalPath} from "@renderer/modules/user-config-store";

import ExternalPathToolBar from "./external-path-tool-bar";
import ExternalPathTable from "./external-path-table";
import {ExternalPathRowData} from "./external-path-table-row";

interface ExternalPathsProps {
  toggleRefresh?: boolean,
  regions: Region[],
}

const ExternalPaths: React.FC<ExternalPathsProps> = ({
  toggleRefresh,
  regions,
}) => {
  const {currentLanguage, translate} = useI18n();
  const {currentUser} = useAuth();

  const [selectedPath, setSelectedPath] = useState<ExternalPathRowData | null>(null);

  // search path
  const [pathSearchText, setPathSearchText] = useState("");
  const handleSearchPath = (target: string) => {
    setPathSearchText(target);
  };

  const {
    externalPathState,
    externalPathData,
    loadExternalPaths,
  } = useExternalPath(currentUser);

  useEffect(() => {
    loadExternalPaths()
      .catch(err => {
        toast.error(`${translate("common.failed")}: ${err}`);
      });
  }, [toggleRefresh]);

  // computed state
  const pathsToRender = externalPathData.list
    .filter(p => p.path.includes(pathSearchText))
    .map(p => {
      const region = regions.find(r => r.s3Id === p.regionId);
      return {
        ...p,
        regionName:
          region?.translatedLabels?.[currentLanguage] ??
          region?.label ??
          p.regionId,
      };
    });

  return (
    <>
      <ExternalPathToolBar
        selectedPath={selectedPath}
        onSearch={handleSearchPath}
      />
      <ExternalPathTable
        loading={externalPathState.loadingPersistence}
        data={pathsToRender}
        selectedExternalPath={selectedPath}
        onChangeSelectedExternalPath={setSelectedPath}
      />
    </>
  );
};

export default ExternalPaths;
