import React, {ChangeEvent, useCallback} from "react";
import {Button, Dropdown, Form, InputGroup} from "react-bootstrap";
import lodash from "lodash";

import * as customize from "@renderer/customize";

import {useI18n} from "@renderer/modules/i18n";
import {BucketItem} from "@renderer/modules/qiniu-client";
import {useDisplayModal} from "@renderer/components/modals/hooks";
import CreateBucket from "@renderer/components/modals/bucket/create-bucket";
import DeleteBucket from "@renderer/components/modals/bucket/delete-bucket";

interface BucketToolBarProps {
  selectedBucket: BucketItem | null,
  searchTotal: number,
  onSearch: (target: string) => void,
  onCreatedBucket: () => void,
  onDeletedBucket: () => void,
}

const BucketToolBar: React.FC<BucketToolBarProps> = ({
  selectedBucket,
  searchTotal,
  onSearch,
  onCreatedBucket,
  onDeletedBucket,
}) => {
  const {translate} = useI18n();

  const handleChangeSearch = useCallback(lodash.debounce((e: ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
  }, 500), [onSearch]);

  const [
    {
      show:isShowCreateBucket,
    },
    {
      showModal: handleClickCreateBucket,
      closeModal: handleHideCreateBucket,
    },
  ] = useDisplayModal();

  const [
    {
      show:isShowDeleteBucket,
    },
    {
      showModal: handleClickDeleteBucket,
      closeModal: handleHideDeleteBucket,
    },
  ] = useDisplayModal();

  return (
    <div className="m-1">
      <div className="d-flex">
        {
          !customize.disable.createBucket &&
          <Button className="text-white" variant="info" size="sm" onClick={handleClickCreateBucket}>
            <i className="bi bi-plus-lg me-1"/>
            {translate("browse.bucketToolbar.createBucketButton")}
          </Button>
        }
        {
          !customize.disable.deleteBucket &&
          <Dropdown className="d-inline ms-1">
            <Dropdown.Toggle disabled={!selectedBucket} variant="outline-solid-gray-300" size="sm">
              {translate("browse.bucketToolbar.moreOperation.toggleButton")}
            </Dropdown.Toggle>

            <Dropdown.Menu>
              <Dropdown.Item onClick={handleClickDeleteBucket}>
                <i className="bi bi-x-lg me-1 text-danger"/>
                {translate("browse.bucketToolbar.moreOperation.deleteBucketButton")}
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        }
        <InputGroup size="sm" className="ms-auto w-25">
          <Form.Control
            type="text"
            placeholder={translate("browse.bucketToolbar.search.holder")}
            onChange={handleChangeSearch}
          />
          <InputGroup.Text>
            <i className="bi bi-search me-1"/>
            {searchTotal}
          </InputGroup.Text>
        </InputGroup>
      </div>
      <CreateBucket
        show={isShowCreateBucket}
        onHide={handleHideCreateBucket}
        onCreatedBucket={onCreatedBucket}
      />
      <DeleteBucket
        show={isShowDeleteBucket}
        onHide={handleHideDeleteBucket}
        regionId={selectedBucket?.regionId ?? ""}
        bucketName={selectedBucket?.name ?? ""}
        onDeletedBucket={onDeletedBucket}
      />
    </div>
  );
};

export default BucketToolBar;
