import React, {useMemo, useState} from "react";
import {Form} from "react-bootstrap";
import classNames from "classnames";

import UploadJob from "@common/models/job/upload-job";

import {translate} from "@renderer/modules/i18n";
import ipcUploadManager from "@renderer/modules/electron-ipc-manages/ipc-upload-manager";

import {useDisplayModal} from "@renderer/components/modals/hooks";
import ConfirmModal from "@renderer/components/modals/common/confirm-modal";
import TooltipButton from "@renderer/components/tooltip-button";
import EmptyHolder from "@renderer/components/empty-holder";

import JobItem from "./job-item";
import UploadJobOperation from "./upload-job-operation";
import Settings from "@renderer/modules/settings";

interface UploadPanelProps {
  data: (UploadJob["uiData"] | undefined)[],
  onChangeSearchText: (searchText: string) => void,
}

const UploadPanel: React.FC<UploadPanelProps> = ({
  data,
  onChangeSearchText,
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


  const defaultIsSkipEmptyDirectoryUpload = useMemo(() => {
    return Settings.skipEmptyDirectoryUpload;
  }, []);
  const [isSkipEmptyDirectoryUpload, setIsSkipEmptyDirectoryUpload] = useState<boolean>(defaultIsSkipEmptyDirectoryUpload);
  const handleToggleIsSkipEmptyDirectoryUpload = () => {
    Settings.skipEmptyDirectoryUpload = !isSkipEmptyDirectoryUpload;
    setIsSkipEmptyDirectoryUpload(!isSkipEmptyDirectoryUpload);
  }

  return (
    <>
      <div className="transfer-panel-content">
        <div className="d-flex justify-content-between p-1 border-bottom">
          <Form.Control
            className="w-50"
            size="sm"
            type="text"
            placeholder={translate("transfer.upload.toolbar.search.holder")}
            onChange={e => onChangeSearchText(e.target.value)}
          />
          <div>
            <TooltipButton
              size="sm"
              iconClassName={classNames(
                "bi bi-folder",
                isSkipEmptyDirectoryUpload ? "" : "text-muted"
              )}
              tooltipPlacement="top"
              tooltipContent={translate("transfer.upload.toolbar.emptyDirectorySwitch")}
              variant={isSkipEmptyDirectoryUpload ? "primary" : "outline-solid-gray-300"}
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
        <div className="job-list p-1">
          {
            // TODO window list to virtual
            !data.length
              ? <EmptyHolder/>
              : data.map((job, i) => job && (
                  <JobItem
                    key={job.id}
                    namePrefix={`${i + 1}. `}
                    data={job}
                    operationButtons={
                      <UploadJobOperation
                        jobId={job.id}
                        status={job.status}
                        resumable={job.progress.resumable}
                      />
                    }
                  />
                )
              )
          }
        </div>
      </div>
      <ConfirmModal
        show={isShowRemoveAllConfirmModal}
        onHide={handleCloseRemoveAllConfirmModal}
        title={translate("transfer.upload.removeAllConfirm.title")}
        content={translate("transfer.upload.removeAllConfirm.content")}
        okText={translate("transfer.upload.removeAllConfirm.ok")}
        cancelText={translate("transfer.upload.removeAllConfirm.cancel")}
        onOk={() => {
          ipcUploadManager.removeAllJobs();
        }}
      />
    </>
  );
};

export default UploadPanel;
