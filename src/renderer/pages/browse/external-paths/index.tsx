import React, {useEffect, useState} from "react";
import {Region} from "kodo-s3-adapter-sdk";

import {useI18n} from "@renderer/modules/i18n";
import {useAuth} from "@renderer/modules/auth";
import {useKodoExternalPath} from "@renderer/modules/kodo-address";

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
  const {currentLanguage} = useI18n();
  const {currentUser} = useAuth();

  const [selectedPath, setSelectedPath] = useState<ExternalPathRowData | null>(null);

  // search path
  const [pathSearchText, setPathSearchText] = useState("");
  const handleSearchPath = (target: string) => {
    setPathSearchText(target);
  };

  const {
    externalPathState: {
      kodoExternalPath,
      externalPaths,
    },
    setExternalPaths,
  } = useKodoExternalPath(currentUser);

  const refreshTable = () => {
    if (!kodoExternalPath) {
      return;
    }
    setExternalPaths(kodoExternalPath.read().list);
  };

  useEffect(refreshTable, [toggleRefresh]);

  // computed state
  const pathsToRender = externalPaths
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
        onAddedExternalPath={refreshTable}
        onDeletedExternalPath={refreshTable}
      />
      <ExternalPathTable
        loading={false}
        data={pathsToRender}
        selectedExternalPath={selectedPath}
        onChangeSelectedExternalPath={setSelectedPath}
      />
    </>
  );
};

export default ExternalPaths;
