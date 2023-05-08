import React, {ChangeEvent, useCallback} from "react";
import {Button, Dropdown, Form, InputGroup} from "react-bootstrap";
import lodash from "lodash";

import {useI18n} from "@renderer/modules/i18n";

import {useDisplayModal} from "@renderer/components/modals/hooks";
import AddExternalPath from "@renderer/components/modals/external-path/add-external-path";
import DeleteExternalPath from "@renderer/components/modals/external-path/delete-external-path";
import {ExternalPathRowData} from "./external-path-table-row";

interface ExternalPathToolBarProps {
  selectedPath: ExternalPathRowData | null,
  onSearch: (target: string) => void,
  onAddedExternalPath: () => void,
  onDeletedExternalPath: () => void,
}

const ExternalPathToolBar: React.FC<ExternalPathToolBarProps> = ({
  selectedPath,
  onSearch,
  onAddedExternalPath,
  onDeletedExternalPath,
}) => {
  const {translate} = useI18n();

  // search state
  const handleChangeSearch = useCallback(lodash.debounce((e: ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
  }, 500), [onSearch]);

  // modal state
  const [
    {
      show: isShowAddExternalPath,
    },
    {
      showModal: handleClickAddExternalPath,
      hideModal: handleHideAddExternalPath,
    },
  ] = useDisplayModal();
  const [
    {
      show: isShowDeleteExternalPath,
    },
    {
      showModal: handleClickDeleteExternalPath,
      hideModal: handleHideDeleteExternalPath,
    },
  ] = useDisplayModal();

  // render
  return (
    <>
      <div className="m-1">
        <div className="d-flex">
          <Button
            className="text-white"
            variant="info"
            size="sm"
            onClick={handleClickAddExternalPath}
          >
            <i className="bi bi-plus-circle me-1"/>
            {translate("browse.externalPathToolBar.addExternalPath")}
          </Button>

          <Dropdown className="d-inline ms-1">
            <Dropdown.Toggle disabled={!selectedPath} variant="outline-solid-gray-300" size="sm">
              {translate("common.more")}
            </Dropdown.Toggle>

            <Dropdown.Menu>
              <Dropdown.Item
                onClick={handleClickDeleteExternalPath}
              >
                <i className="bi bi-x-lg me-1 text-danger"/>
                {translate("common.delete")}
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>

          <InputGroup size="sm" className="ms-auto w-25">
            <Form.Control
              type="text"
              placeholder={translate("browse.externalPathToolBar.search.holder")}
              onChange={handleChangeSearch}
            />
          </InputGroup>
        </div>
      </div>
      <AddExternalPath
        show={isShowAddExternalPath}
        onHide={handleHideAddExternalPath}
        onAddedExternalPath={onAddedExternalPath}
      />
      <DeleteExternalPath
        show={isShowDeleteExternalPath}
        onHide={handleHideDeleteExternalPath}
        externalPath={selectedPath}
        regionName={selectedPath?.regionName || selectedPath?.regionId}
        onDeletedExternalPath={onDeletedExternalPath}
      />
    </>
  );
}

export default ExternalPathToolBar;
