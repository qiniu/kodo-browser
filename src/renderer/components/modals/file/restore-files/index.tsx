import React, {useEffect, useMemo, useState} from "react";
import {Button, Modal, ModalProps, Spinner} from "react-bootstrap";
import {toast} from "react-hot-toast";
import {SubmitHandler, useForm} from "react-hook-form";

import {BackendMode} from "@common/qiniu";

import StorageClass from "@common/models/storage-class";
import {useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {FileItem, restoreFiles, stopRestoreFiles} from "@renderer/modules/qiniu-client";
import {useFileOperation} from "@renderer/modules/file-operation";
import * as AuditLog from "@renderer/modules/audit-log";

import {
  BatchProgress,
  BatchTaskStatus,
  ErroredFileOperation,
  ErrorFileList,
  useBatchProgress
} from "@renderer/components/batch-progress";
import {RestoreForm, RestoreFormData} from "@renderer/components/forms";

import {OperationDoneRecallFn} from "../types";

interface RestoreFilesProps {
  regionId: string,
  bucketName: string,
  basePath: string,
  fileItems: FileItem.Item[],
  storageClasses: StorageClass[],
  onRestoredFile: OperationDoneRecallFn,
}

const RestoreFiles: React.FC<ModalProps & RestoreFilesProps> = (props) => {
  const {
    regionId,
    bucketName,
    basePath,
    fileItems,
    storageClasses,
    onRestoredFile,
    ...modalProps
  } = props;

  const {translate} = useI18n();
  const {currentUser} = useAuth();
  const {bucketPreferBackendMode: preferBackendMode} = useFileOperation();

  // form to restore
  const restoreFormController = useForm<RestoreFormData>({
    mode: "onChange",
    defaultValues: {
      days: 1,
    },
  });

  const {
    handleSubmit,
    reset,
    formState: {
      isSubmitting,
    },
  } = restoreFormController;

  // batch operation progress states
  const [batchProgressState, setBatchProgressState] = useBatchProgress();
  const [erroredFileOperations, setErroredFileOperations] = useState<ErroredFileOperation[]>([]);

  // cache operation states prevent props update after modal opened.
  const {
    memoFileItems,
    memoRegionId,
    memoBucketName,
    memoBasePath,
    memoStorageClasses,
  } = useMemo(() => {
    if (modalProps.show) {
      return {
        memoFileItems: fileItems,
        memoRegionId: regionId,
        memoBucketName: bucketName,
        memoBasePath: basePath,
        memoStorageClasses: storageClasses,
      };
    } else {
      return {
        memoFileItems: [],
        memoRegionId: regionId,
        memoBucketName: bucketName,
        memoBasePath: basePath,
        memoStorageClasses: storageClasses,
      };
    }
  }, [modalProps.show]);

  // reset states when open/close modal.
  useEffect(() => {
    if (modalProps.show) {
      reset();
    } else {
      setBatchProgressState({
        status: BatchTaskStatus.Standby,
      });
      setErroredFileOperations([]);
    }
  }, [modalProps.show]);

  const handleSubmitRestoreFiles: SubmitHandler<RestoreFormData> = (data) => {
    if (!memoFileItems.length || !currentUser) {
      return;
    }
    const opt = {
      id: currentUser.accessKey,
      secret: currentUser.accessSecret,
      isPublicCloud: currentUser.endpointType === EndpointType.Public,
      storageClasses: memoStorageClasses,
      preferKodoAdapter: preferBackendMode === BackendMode.Kodo,
      preferS3Adapter: preferBackendMode === BackendMode.S3,
    };
    setBatchProgressState({
      status: BatchTaskStatus.Running,
    });
    AuditLog.log(AuditLog.Action.RestoreFiles, {
      regionId: memoRegionId,
      bucket: memoBucketName,
      paths: memoFileItems.map(i => i.path.toString()),
      days: data.days,
    });
    const p = restoreFiles(
      memoRegionId,
      memoBucketName,
      memoFileItems,
      data.days,
      (progress) => {
        setBatchProgressState({
          total: progress.total,
          finished: progress.current,
          errored: progress.errorCount,
        })
      },
      () => {},
      opt,
    )
    p
      .then(batchErrors => {
        setErroredFileOperations(batchErrors.map<ErroredFileOperation>(batchError => ({
          fileType: batchError.item.itemType,
          path: batchError.item.path.toString().slice(memoBasePath.length),
          errorMessage: batchError.error.translated_message
            || batchError.error.message
            || batchError.error.code,
        })));
        onRestoredFile({
          originBasePath: memoBasePath,
        });
        AuditLog.log(AuditLog.Action.RestoreFilesDone);
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
    stopRestoreFiles();
  }

  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-fire me-1"/>
          {translate("modals.restoreFiles.title")}
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
                {translate("modals.restoreFiles.description")}
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
              <RestoreForm
                formController={restoreFormController}
                onSubmit={handleSubmitRestoreFiles}
              />
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
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              onClick={handleSubmit(handleSubmitRestoreFiles)}
            >
              {
                isSubmitting
                  ? <>
                    <Spinner className="me-1" animation="border" size="sm"/>
                    {translate("common.submitting")}
                  </>
                  : translate("common.submit")
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

export default RestoreFiles;
