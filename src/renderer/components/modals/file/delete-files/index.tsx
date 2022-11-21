import React, {useEffect, useMemo, useState} from "react";
import {Button, Modal, ModalProps, Spinner} from "react-bootstrap";
import {toast} from "react-hot-toast";

import StorageClass from "@common/models/storage-class";
import {BackendMode} from "@common/qiniu";

import {useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {deleteFiles, FileItem, stopDeleteFiles} from "@renderer/modules/qiniu-client";
import {useFileOperation} from "@renderer/modules/file-operation";
import * as AuditLog from "@renderer/modules/audit-log";

import {useSubmitModal} from "@renderer/components/modals/hooks";
import {
  BatchProgress,
  BatchTaskStatus,
  ErroredFileOperation,
  ErrorFileList,
  useBatchProgress
} from "@renderer/components/batch-progress";

import {OperationDoneRecallFn} from "@renderer/components/modals/file/types";

interface DeleteFilesProps {
  regionId: string,
  bucketName: string,
  basePath: string,
  fileItems: FileItem.Item[],
  storageClasses: StorageClass[],
  onDeletedFile: OperationDoneRecallFn,
}

const DeleteFiles: React.FC<ModalProps & DeleteFilesProps> = (props) => {
  const {
    regionId,
    bucketName,
    basePath,
    fileItems,
    storageClasses,
    onDeletedFile,
    ...modalProps
  } = props;

  const {translate} = useI18n();
  const {currentUser} = useAuth();
  const {bucketPreferBackendMode: preferBackendMode} = useFileOperation();

  // cache operation states prevent props update after modal opened.
  const {
    memoFileItems,
    memoRegionId,
    memoBucketName,
    memoBasePath,
  } = useMemo(() => ({
    memoFileItems: modalProps.show ? fileItems : [],
    memoRegionId: regionId,
    memoBucketName: bucketName,
    memoBasePath: basePath,
  }), [modalProps.show]);

  const {
    state: {
      isSubmitting,
    },
    handleSubmit,
  } = useSubmitModal();
  const [batchProgressState, setBatchProgressState] = useBatchProgress();
  const [erroredFileOperations, setErroredFileOperations] = useState<ErroredFileOperation[]>([]);

  useEffect(() => {
    if (modalProps.show) {
    } else {
      setBatchProgressState({
        status: BatchTaskStatus.Standby,
      });
      setErroredFileOperations([]);
    }
  }, [modalProps.show]);

  const handleSubmitDeleteFiles = () => {
    if (!memoFileItems.length || !currentUser) {
      return Promise.resolve();
    }
    AuditLog.log(AuditLog.Action.DeleteFiles, {
      regionId: memoRegionId,
      bucket: memoBucketName,
      paths: memoFileItems.map(i => i.path.toString()),
    });
    const opt = {
      id: currentUser.accessKey,
      secret: currentUser.accessSecret,
      isPublicCloud: currentUser.endpointType === EndpointType.Public,
      storageClasses: storageClasses,
      preferKodoAdapter: preferBackendMode === BackendMode.Kodo,
      preferS3Adapter: preferBackendMode === BackendMode.S3,
    };
    setBatchProgressState({
      status: BatchTaskStatus.Running,
    });
    const p = deleteFiles(
      memoRegionId,
      memoBucketName,
      memoFileItems,
      (progress) => {
        setBatchProgressState({
          total: progress.total,
          finished: progress.current,
          errored: progress.errorCount,
        })
      },
      () => {},
      opt,
    );
    p
      .then(batchErrors => {
        setErroredFileOperations(batchErrors.map<ErroredFileOperation>(batchError => ({
          fileType: batchError.item.itemType,
          path: batchError.item.path.toString().slice(memoBasePath.length),
          errorMessage: batchError.error.translated_message
            || batchError.error.message
            || batchError.error.code,
        })));
        onDeletedFile({
          originBasePath: memoBasePath,
        });
        AuditLog.log(AuditLog.Action.DeleteFilesDone);
      })
      .finally(() => {
        setBatchProgressState({
          status: BatchTaskStatus.Ended,
        });
      });
    return toast.promise(p, {
      loading: translate("common.submitting"),
      success: translate("common.submitted"),
      error: err => `${translate("common.failed")}: ${err}`,
    });
  }

  const handleInterrupt = () => {
    stopDeleteFiles();
  }

  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-trash me-1 text-danger"/>
          {translate("modals.deleteFiles.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {
          !memoFileItems.length
            ? <div>
              {translate("common.noObjectSelected")}
            </div>
            : <>
              <div className="text-danger">
                {translate("modals.deleteFiles.description")}
              </div>
              <ul className="scroll-max-vh-40">
                {
                  memoFileItems.map(fileItem => (
                    <li key={fileItem.path.toString()}>
                      {
                        FileItem.isItemFolder(fileItem)
                          ? <i className="bi bi-folder-fill me-1 text-yellow"/>
                          : <i className="bi bi-file-earmark me-1"/>
                      }
                      {fileItem.name}
                    </li>
                  ))
                }
              </ul>
            </>
        }
        {
          batchProgressState.status === BatchTaskStatus.Standby
            ? null
            : <BatchProgress
              status={batchProgressState.status}
              total={batchProgressState.total}
              finished={batchProgressState.finished}
              errored={batchProgressState.errored}
              onClickInterrupt={handleInterrupt}
            />
        }
        {
          erroredFileOperations.length > 0
            ? <ErrorFileList
              data={erroredFileOperations}
            />
            : null
        }
      </Modal.Body>
      <Modal.Footer>
        {
          !memoFileItems.length || batchProgressState.status === BatchTaskStatus.Ended
            ? null
            : <Button
              variant="danger"
              size="sm"
              disabled={isSubmitting}
              onClick={handleSubmit(handleSubmitDeleteFiles)}
            >
              {
                isSubmitting
                  ? <>
                    <Spinner className="me-1" animation="border" size="sm"/>
                    {translate("common.delete")}
                  </>
                  : translate("common.delete")
              }
            </Button>
        }
        <Button
          variant="light"
          size="sm"
          onClick={modalProps.onHide}
        >
          {translate("common.close")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeleteFiles;
