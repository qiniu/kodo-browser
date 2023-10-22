import React, {useEffect, useState, useSyncExternalStore} from "react";
import {Button, Form} from "react-bootstrap";
import classNames from "classnames";
import AutoResizer from "react-virtualized-auto-sizer";
import {areEqual, FixedSizeList as List, ListChildComponentProps} from "react-window";

import {Status} from "@common/models/job/types";
import DownloadJob from "@common/models/job/download-job";

import {translate} from "@renderer/modules/i18n";
import {appPreferences} from "@renderer/modules/user-config-store";
import ipcDownloadManager from "@renderer/modules/electron-ipc-manages/ipc-download-manager";

import {useDisplayModal} from "@renderer/components/modals/hooks";
import ConfirmModal from "@renderer/components/modals/common/confirm-modal";
import TooltipButton from "@renderer/components/tooltip-button";
import EmptyHolder from "@renderer/components/empty-holder";

import JobItem from "./job-item";
import DownloadJobOperation from "./download-job-operation";

import {ITEM_HEIGHT, LOAD_MORE_THRESHOLD} from "./const";

const Item: React.FC<ListChildComponentProps<(DownloadJob["uiData"] | undefined)[]>> = ({
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
        key={job.id}
        namePrefix={`${index + 1}. `}
        data={job}
        operationButtons={
          <DownloadJobOperation
            jobId={job.id}
            status={job.status}
            resumable={job.progress.resumable}
          />
        }
      />
    </div>
  )
};

const MemoItem = React.memo(Item, areEqual);

interface DownloadPanelProps {
  stopped: number,
  failed: number,
  data: (DownloadJob["uiData"] | undefined)[],
  hasMore: boolean,
  onLoadMore: () => void,
  onChangeSearchQuery: (query: {status?: Status, name?: string}) => void,
}

const DownloadPanel: React.FC<DownloadPanelProps> = ({
  stopped,
  failed,
  data,
  hasMore,
  onLoadMore,
  onChangeSearchQuery,
}) => {
  const {
    state: appPreferencesState,
    data: appPreferencesData,
  } = useSyncExternalStore(
    appPreferences.store.subscribe,
    appPreferences.store.getSnapshot,
  );

  const [
    {
      show: isShowRemoveAllConfirmModal
    },
    {
      showModal: handleShowRemoveAllConfirmModal,
      hideModal: handleCloseRemoveAllConfirmModal,
    },
  ] = useDisplayModal();

  const isOverwriteDownload = appPreferencesData.overwriteDownloadEnabled;
  const handleToggleIsOverwriteDownload = () => {
    appPreferences.set("overwriteDownloadEnabled", !isOverwriteDownload);
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
              <option value={Status.Running}>{translate("transfer.jobItem.status.running")}</option>
              <option value={Status.Waiting}>{translate("transfer.jobItem.status.waiting")}</option>
              <option value={Status.Stopped}>{translate("transfer.jobItem.status.stopped")}</option>
              <option value={Status.Finished}>{translate("transfer.jobItem.status.finished")}</option>
              <option value={Status.Failed}>{translate("transfer.jobItem.status.failed")}</option>
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
                "bi bi-file-earmark-arrow-down-fill",
                isOverwriteDownload ? "" : "text-muted"
              )}
              loading={!appPreferencesState.initialized}
              tooltipPlacement="top"
              tooltipContent={translate("transfer.download.toolbar.overwriteSwitch")}
              variant={isOverwriteDownload ? "primary" : "outline-solid-gray-300"}
              onClick={handleToggleIsOverwriteDownload}
            />
            <TooltipButton
              className="ms-1"
              size="sm"
              iconClassName="bi bi-play-fill text-primary"
              tooltipPlacement="top"
              tooltipContent={translate("transfer.download.toolbar.startAllButton")}
              onClick={() => ipcDownloadManager.startAllJobs()}
            />
            <TooltipButton
              className="ms-1"
              size="sm"
              iconClassName="bi bi-eraser-fill"
              tooltipPlacement="top"
              tooltipContent={translate("transfer.download.toolbar.cleanupButton")}
              onClick={() => ipcDownloadManager.cleanUpJobs()}
            />
            <TooltipButton
              className="ms-1"
              size="sm"
              iconClassName="bi bi-x-lg text-danger"
              tooltipPlacement="top"
              tooltipContent={translate("transfer.download.toolbar.removeAllButton")}
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
        title={translate("transfer.download.removeAllConfirm.title")}
        content={translate("transfer.download.removeAllConfirm.content")}
        okText={translate("transfer.download.removeAllConfirm.ok")}
        okVariant="danger"
        cancelText={translate("transfer.download.removeAllConfirm.cancel")}
        onOk={() => {
          ipcDownloadManager.removeAllJobs();
        }}
      />
    </>
  );
};

export default DownloadPanel;
