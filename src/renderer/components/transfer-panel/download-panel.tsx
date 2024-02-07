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
  onChangeSearchText: (searchText: string) => void,
}

const DownloadPanel: React.FC<DownloadPanelProps> = ({
  stopped,
  failed,
  data,
  hasMore,
  onLoadMore,
  onChangeSearchText,
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

  // search state
  const [searchText, setSearchText] = useState<string>("");
  useEffect(
    () => onChangeSearchText(searchText),
    [searchText]
  );

  // render
  return (
    <>
      <div className="transfer-panel-content">
        <div className="d-flex justify-content-between p-1 border-bottom">
          <Form.Control
            className="w-50"
            size="sm"
            type="text"
            placeholder={translate("transfer.download.toolbar.search.holder")}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
          <div className="d-flex align-items-center justify-content-center">
            {
              stopped > 0 &&
              <Button
                size="sm"
                variant="icon-warning"
                className="ms-1"
                onClick={() => setSearchText(Status.Stopped)}
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
                onClick={() => setSearchText(Status.Failed)}
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
