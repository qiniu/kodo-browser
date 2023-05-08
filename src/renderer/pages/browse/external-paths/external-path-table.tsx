import React from "react";
import {Form, Table} from "react-bootstrap";

import {useI18n} from "@renderer/modules/i18n";
import {ExternalPathItem, useKodoNavigator} from "@renderer/modules/kodo-address";

import EmptyHolder from "@renderer/components/empty-holder";

import ExternalPathTableRow, {ExternalPathRowData} from "./external-path-table-row";

interface ExternalPathTableProps {
  loading: boolean,
  data: ExternalPathRowData[],
  selectedExternalPath: ExternalPathItem | null,
  onChangeSelectedExternalPath: (externalPath: ExternalPathRowData | null) => void,
}

const ExternalPathTable: React.FC<ExternalPathTableProps> = ({
  loading,
  data,
  selectedExternalPath,
  onChangeSelectedExternalPath,
}) => {
  const {translate} = useI18n();
  const {goTo} = useKodoNavigator();

  const handleClickRow = (externalPath: ExternalPathRowData) => {
    if (
      externalPath.protocol === selectedExternalPath?.protocol &&
      externalPath.path  === selectedExternalPath?.path &&
      externalPath.regionId === selectedExternalPath?.regionId
    ) {
      onChangeSelectedExternalPath(null);
      return;
    }
    onChangeSelectedExternalPath(externalPath);
  }

  const handleClickPath = (externalPath: ExternalPathRowData) => {
    goTo(externalPath);
  }

  return (
    <Form className="overflow-auto w-100 h-100">
      <Table bordered striped hover size="sm">
        <colgroup>
          <col style={{width: "2rem"}}/>
          <col/>
          <col/>
        </colgroup>
        <thead
          className="sticky-top bg-body"
          style={{zIndex: 1}}
        >
        <tr>
          <th></th>
          <th>{translate("browse.externalPathTable.path")}</th>
          <th>{translate("browse.externalPathTable.regionName")}</th>
        </tr>
        </thead>
        <tbody>
        {
          data.length
            ? data.map(item => (
              <ExternalPathTableRow
                key={item.protocol + item.path + item.regionId}
                data={item}
                isSelected={
                  selectedExternalPath?.protocol === item.protocol &&
                  selectedExternalPath?.path === item.path &&
                  selectedExternalPath?.regionId === item.regionId
                }
                onClickRow={handleClickRow}
                onClickPath={handleClickPath}
              />
            ))
            : <EmptyHolder loading={loading} col={3}/>
        }
        </tbody>
      </Table>
    </Form>
  );
};

export default ExternalPathTable;
