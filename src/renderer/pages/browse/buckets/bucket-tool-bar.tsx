import React, {ChangeEvent, useCallback} from "react";
import {Button, ButtonGroup, Dropdown, Form, InputGroup} from "react-bootstrap";
import lodash from "lodash";

import * as customize from "@renderer/customize";

import {useI18n} from "@renderer/modules/i18n";
import {BucketItem} from "@renderer/modules/qiniu-client";
import {ContentViewStyle} from "@renderer/modules/settings";
import {useDisplayModal} from "@renderer/components/modals/hooks";
import CreateBucket from "@renderer/components/modals/bucket/create-bucket";
import UpdateBucketRemark from "@renderer/components/modals/bucket/update-bucket-remark";
import DeleteBucket from "@renderer/components/modals/bucket/delete-bucket";

interface BucketToolBarProps {
  selectedBucket: BucketItem | null,
  searchTotal: number,
  onSearch: (target: string) => void,
  viewStyle: ContentViewStyle,
  onChangeView: (style: ContentViewStyle) => void,
  onCreatedBucket: () => void,
  onUpdatedBucketRemark: (bucket: BucketItem) => void,
  onDeletedBucket: () => void,
}

const BucketToolBar: React.FC<BucketToolBarProps> = ({
  selectedBucket,
  searchTotal,
  onSearch,
  viewStyle,
  onChangeView,
  onCreatedBucket,
  onUpdatedBucketRemark,
  onDeletedBucket,
}) => {
  const {translate} = useI18n();

  // search state
  const handleChangeSearch = useCallback(lodash.debounce((e: ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
  }, 500), [onSearch]);

  // modal state
  const [
    {
      show:isShowCreateBucket,
    },
    {
      showModal: handleClickCreateBucket,
      hideModal: handleHideCreateBucket,
    },
  ] = useDisplayModal();

  const [
    {
      show: isShowUpdateBucketRemark,
    },
    {
      showModal: handleClickUpdateBucketRemark,
      hideModal: handleHideUpdateBucketRemark,
    },
  ] = useDisplayModal();

  const [
    {
      show: isShowDeleteBucket,
    },
    {
      showModal: handleClickDeleteBucket,
      hideModal: handleHideDeleteBucket,
    },
  ] = useDisplayModal();

  // render
  return (
    <div className="m-1">
      <div className="d-flex">
        {
          !customize.disable.createBucket &&
          <Button className="text-white" variant="info" size="sm" onClick={handleClickCreateBucket}>
            <i className="bi bi-database-add me-1"/>
            {translate("browse.bucketToolbar.createBucketButton")}
          </Button>
        }
        <Dropdown className="d-inline ms-1">
          <Dropdown.Toggle disabled={!selectedBucket} variant="outline-solid-gray-300" size="sm">
            {translate("common.more")}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item
              disabled={selectedBucket?.grantedPermission === "readonly"}
              onClick={handleClickUpdateBucketRemark}
            >
              <i className="bi bi-pencil me-1"/>
              {translate("browse.bucketToolbar.moreOperation.updateBucketRemarkButton")}
            </Dropdown.Item>
            {
              !customize.disable.deleteBucket &&
              <Dropdown.Item
                disabled={selectedBucket?.grantedPermission === "readonly"}
                onClick={handleClickDeleteBucket}
              >
                <i className="bi bi-x-lg me-1 text-danger"/>
                {translate("browse.bucketToolbar.moreOperation.deleteBucketButton")}
              </Dropdown.Item>
            }
          </Dropdown.Menu>
        </Dropdown>
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

        <ButtonGroup size="sm" className="ms-1">
          <Button
            variant={viewStyle === ContentViewStyle.Table ? "primary" : "outline-solid-gray-300"}
            onClick={() => onChangeView(ContentViewStyle.Table)}
          >
            <i className="bi bi-list"/>
          </Button>
          <Button
            variant={viewStyle === ContentViewStyle.Grid ? "primary" : "outline-solid-gray-300"}
            onClick={() => onChangeView(ContentViewStyle.Grid)}
          >
            <i className="bi bi-grid"/>
          </Button>
        </ButtonGroup>
      </div>
      <CreateBucket
        show={isShowCreateBucket}
        onHide={handleHideCreateBucket}
        onCreatedBucket={onCreatedBucket}
      />
      <UpdateBucketRemark
        show={isShowUpdateBucketRemark}
        onHide={handleHideUpdateBucketRemark}
        bucketItem={selectedBucket}
        onUpdatedBucketRemark={onUpdatedBucketRemark}
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
