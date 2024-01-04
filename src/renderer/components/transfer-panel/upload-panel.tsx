import React, {useEffect, useState, useSyncExternalStore} from "react";
import {Button, Form} from "react-bootstrap";
import {toast} from "react-hot-toast";
import classNames from "classnames";
import AutoResizer from "react-virtualized-auto-sizer";
import {areEqual, FixedSizeList as List, ListChildComponentProps} from 'react-window';

import {Status} from "@common/models/job/types";
import UploadJob from "@common/models/job/upload-job";

import {translate} from "@renderer/modules/i18n";
import {appPreferences} from "@renderer/modules/user-config-store";
import ipcUploadManager from "@renderer/modules/electron-ipc-manages/ipc-upload-manager";

import {useDisplayModal} from "@renderer/components/modals/hooks";
import ConfirmModal from "@renderer/components/modals/common/confirm-modal";
import TooltipButton from "@renderer/components/tooltip-button";
import EmptyHolder from "@renderer/components/empty-holder";

import JobItem from "./job-item";
import UploadJobOperation from "./upload-job-operation";

import {ITEM_HEIGHT, LOAD_MORE_THRESHOLD} from "./const";

const Item: React.FC<ListChildComponentProps<(UploadJob["uiData"] | undefined)[]>> = ({
  index,
  style,
  data
}) => {
  const job = data[index];
  if (!job) {
    return (
      <div style={style}>
        {index}. {translate("common.errored")}
      </div>
    );
  }
  return (
    <div style={style}>
      <JobItem
        namePrefix={`${index + 1}. `}
        data={job}
        operationButtons={
          <UploadJobOperation
            jobId={job.id}
            status={job.status}
            resumable={job.progress.resumable}
          />
        }
      />
    </div>
  );
};

const MemoItem = React.memo(Item, areEqual);

interface UploadPanelProps {
  stopped: number,
  failed: number,
  data: (UploadJob["uiData"] | undefined)[],
  hasMore: boolean,
  onLoadMore: () => void,
  onChangeSearchQuery: (query: {status?: Status, name?: string}) => void,
}

const UploadPanel: React.FC<UploadPanelProps> = ({
  stopped,
  failed,
  data,
  hasMore,
  onLoadMore,
  onChangeSearchQuery,
}) => {
  const [
    {
      show: isShowRemoveAllConfirmModal
    },
    {
      showModal: handleShowRemoveAllConfirmModal,
      hideModal: handleCloseRemoveAllConfirmModal,
    },
  ] = useDisplayModal();


  const {
    state: appPreferencesState,
    data: appPreferencesData,
  } = useSyncExternalStore(
    appPreferences.store.subscribe,
    appPreferences.store.getSnapshot,
  );

  const isSkipEmptyDirectoryUpload = appPreferencesData.skipEmptyDirectoryUpload;
  const handleToggleIsSkipEmptyDirectoryUpload = () => {
    appPreferences.set("skipEmptyDirectoryUpload", !isSkipEmptyDirectoryUpload)
      .catch(err => {
        toast.error(`${translate("common.failed")}: ${err}`);
      });
  };

  // handle search change
  const [searchQuery, setSearchQuery] = useState<{status?: Status, name?: string}>({});
  useEffect(() => {
    onChangeSearchQuery(searchQuery);
  }, [searchQuery]);
  const handleChangeSearchStatus = (statusText?: string) => {
    const status = statusText && (Object.values(Status) as string[]).includes(statusText)
      ? statusText as Status
      : undefined;
    setSearchQuery(q => ({
      ...q,
      status,
    }));
  };
  const handleChangeSearchName = (name: string) => {
    setSearchQuery(q => ({
      ...q,
      name,
    }));
  };

  // render
  return (
    <>
      <div className="transfer-panel-content">
        <div className="d-flex justify-content-between p-1 border-bottom">
          <div className="d-flex">
            <Form.Select
              className="me-1"
              style={{
                width: "6.5rem",
              }}
              size="sm"
              value={searchQuery.status}
              onChange={e => handleChangeSearchStatus(e.target.value)}
            >
              <option value="all">{translate("common.all")}</option>
              <option value={Status.Waiting}>{translate("transfer.jobItem.status.waiting")}</option>
              <option value={Status.Running}>{translate("transfer.jobItem.status.running")}</option>
              <option value={Status.Stopped}>{translate("transfer.jobItem.status.stopped")}</option>
              <option value={Status.Finished}>{translate("transfer.jobItem.status.finished")}</option>
              <option value={Status.Failed}>{translate("transfer.jobItem.status.failed")}</option>
              <option value={Status.Duplicated}>{translate("transfer.jobItem.status.duplicated")}</option>
            </Form.Select>
            <Form.Control
              size="sm"
              type="text"
              placeholder={translate("transfer.upload.toolbar.search.holder")}
              value={searchQuery.name}
              onChange={e => handleChangeSearchName(e.target.value)}
            />
          </div>
          <div className="d-flex align-items-center justify-content-center">
            {
              stopped > 0 &&
              <Button
                size="sm"
                variant="icon-warning"
                className="ms-1"
                onClick={() => handleChangeSearchStatus(Status.Stopped)}
              >
                <i className="bi bi-info-circle-fill me-1"/>{stopped}
              </Button>
            }
            {
              failed > 0 &&
              <Button
                size="sm"
                variant="icon-danger"
                className="ms-1"
                onClick={() => handleChangeSearchStatus(Status.Failed)}
              >
                <i className="bi bi-x-circle-fill me-1"/>{failed}
              </Button>
            }
          </div>
          <div>
            <TooltipButton
              size="sm"
              iconClassName={classNames(
                "bi bi-folder",
                isSkipEmptyDirectoryUpload ? "text-muted" : ""
              )}
              loading={!appPreferencesState.initialized}
              tooltipPlacement="top"
              tooltipContent={translate("transfer.upload.toolbar.emptyDirectorySwitch")}
              variant={isSkipEmptyDirectoryUpload ? "outline-solid-gray-300" : "primary"}
              onClick={handleToggleIsSkipEmptyDirectoryUpload}
            />
            <TooltipButton
              className="ms-1"
              size="sm"
              iconClassName="bi bi-play-fill text-primary"
              tooltipPlacement="top"
              tooltipContent={translate("transfer.upload.toolbar.startAllButton")}
              onClick={() => ipcUploadManager.startAllJobs()}
            />
            <TooltipButton
              className="ms-1"
              size="sm"
              iconClassName="bi bi-eraser-fill"
              tooltipPlacement="top"
              tooltipContent={translate("transfer.upload.toolbar.cleanupButton")}
              onClick={() => ipcUploadManager.cleanUpJobs()}
            />
            <TooltipButton
              className="ms-1"
              size="sm"
              iconClassName="bi bi-x-lg text-danger"
              tooltipPlacement="top"
              tooltipContent={translate("transfer.upload.toolbar.removeAllButton")}
              onClick={handleShowRemoveAllConfirmModal}
            />
          </div>
        </div>
        <div className="job-list w-100 h-100 p-1">
          <AutoResizer>
            {({width, height}) => (
              <List
                width={width}
                height={height}
                itemSize={ITEM_HEIGHT}
                itemCount={data.length}
                itemData={data}
                onScroll={({scrollOffset}) => {
                  if (!hasMore) {
                    return;
                  }
                  const contentHeight = ITEM_HEIGHT * data.length;
                  const heightToReachBottom = contentHeight - (height + scrollOffset);
                  if (heightToReachBottom < LOAD_MORE_THRESHOLD) {
                    onLoadMore();
                  }
                }}
              >
                {MemoItem}
              </List>
            )}
          </AutoResizer>
          {
            !data.length &&
            <EmptyHolder loading={hasMore}/>
          }
        </div>
      </div>
      <ConfirmModal
        show={isShowRemoveAllConfirmModal}
        onHide={handleCloseRemoveAllConfirmModal}
        title={translate("transfer.upload.removeAllConfirm.title")}
        content={translate("transfer.upload.removeAllConfirm.content")}
        okText={translate("transfer.upload.removeAllConfirm.ok")}
        okVariant="danger"
        cancelText={translate("transfer.upload.removeAllConfirm.cancel")}
        onOk={() => {
          ipcUploadManager.removeAllJobs();
        }}
      />
    </>
  );
};

export default UploadPanel;
