import React, {Fragment, useEffect, useMemo, useState} from "react";
import {Button, Form, Modal, ModalProps, Spinner} from "react-bootstrap";
import {toast} from "react-hot-toast";
import {SubmitHandler, useForm} from "react-hook-form";

import StorageClass from "@common/models/storage-class";
import {BackendMode} from "@common/qiniu";

import {FileRename} from "@renderer/const/patterns";
import {useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {
  checkFileOrDirectoryExists,
  FileItem,
  moveOrCopyFile,
  moveOrCopyFiles,
  stopMoveOrCopyFiles
} from "@renderer/modules/qiniu-client";
import {useFileOperation} from "@renderer/modules/file-operation";
import * as AuditLog from "@renderer/modules/audit-log";

import {usePromiseConfirm} from "@renderer/components/lite-confirm";
import {
  BatchProgress,
  BatchTaskStatus,
  ErroredFileOperation,
  ErrorFileList,
  useBatchProgress
} from "@renderer/components/batch-progress";

import {OperationDoneRecallFn} from "../types";

interface RenameFileProps {
  regionId: string,
  bucketName: string,
  basePath: string,
  fileItem?: FileItem.Item,
  storageClasses: StorageClass[],
  onRenamedFile: OperationDoneRecallFn,
}

interface RenameFileFormData {
  fileName: string,
}

const RenameFile: React.FC<ModalProps & RenameFileProps> = (props) => {
  const {
    regionId,
    bucketName,
    basePath,
    fileItem,
    storageClasses,
    onRenamedFile,
    ...modalProps
  } = props;

  const {translate} = useI18n();
  const {currentUser} = useAuth();
  const {bucketPreferBackendMode: preferBackendMode} = useFileOperation();

  const [replaceConfirmState, toggleReplaceConfirm] = usePromiseConfirm();

  // cache operation states prevent props update after modal opened.
  const {
    memoFileItem,
    memoRegionId,
    memoBucketName,
    memoBasePath,
    memoStorageClasses,
  } = useMemo(() => ({
    memoFileItem: fileItem,
    memoRegionId: regionId,
    memoBucketName: bucketName,
    memoBasePath: basePath,
    memoStorageClasses: storageClasses,
  }), [modalProps.show]);

  const {
    handleSubmit,
    register,
    reset,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<RenameFileFormData>({
    mode: "onChange",
    defaultValues: {
      fileName: memoFileItem?.name ?? "",
    },
  });

  const [batchProgressState, setBatchProgressState] = useBatchProgress();
  const [erroredFileOperations, setErroredFileOperations] = useState<ErroredFileOperation[]>([]);

  useEffect(() => {
    if (modalProps.show) {
      reset({
        fileName: memoFileItem?.name ?? "",
      });
    } else {
      toggleReplaceConfirm(false);
      setBatchProgressState({
        status: BatchTaskStatus.Standby,
      });
      setErroredFileOperations([]);
      replaceConfirmState.handleConfirm?.(false);
    }
  }, [modalProps.show]);

  const checkExists = (path: string): Promise<boolean> => {
    if (!currentUser) {
      return Promise.reject();
    }
    const opt = {
      id: currentUser.accessKey,
      secret: currentUser.accessSecret,
      isPublicCloud: currentUser.endpointType === EndpointType.Public,
      preferKodoAdapter: preferBackendMode === BackendMode.Kodo,
      preferS3Adapter: preferBackendMode === BackendMode.S3,
    };
    return checkFileOrDirectoryExists(
      memoRegionId,
      memoBucketName,
      path,
      opt,
    );
  };

  const renameFile = (origin: FileItem.File, toPath: string) => {
    if (!currentUser) {
      return;
    }
    const opt = {
      id: currentUser.accessKey,
      secret: currentUser.accessSecret,
      isPublicCloud: currentUser.endpointType === EndpointType.Public,
      preferKodoAdapter: preferBackendMode === BackendMode.Kodo,
      preferS3Adapter: preferBackendMode === BackendMode.S3,
    };
    AuditLog.log(AuditLog.Action.MoveOrCopyFile, {
      regionId: memoRegionId,
      bucket: memoBucketName,
      from: origin.path.toString(),
      to: toPath,
      type: "move",
      storageClass: origin.storageClass,
    });
    return moveOrCopyFile(
      memoRegionId,
      memoBucketName,
      origin.path,
      toPath,
      false,
      opt,
    );
  }

  const renameDirectory = (origin: FileItem.Folder, toPath: string) => {
    if (!currentUser) {
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
    AuditLog.log(AuditLog.Action.MoveOrCopyFilesStart, {
      regionId: memoRegionId,
      from: [{
        bucket: origin.bucket,
        path: origin.path.toString(),
      }],
      to: {
        bucket: memoBucketName,
        path: memoBasePath,
      },
      type: "move",
    });
    const result = moveOrCopyFiles(
      memoRegionId,
      [origin],
      {
        bucket: memoBucketName,
        key: toPath,
      },
      (progress) => {
        setBatchProgressState({
          total: progress.total,
          finished: progress.current,
          errored: progress.errorCount,
        });
      },
      () => {
      },
      false,
      toPath,
      opt,
    );
    return result
      .then(batchErrors => {
        setErroredFileOperations(batchErrors.map<ErroredFileOperation>(batchError => ({
          fileType: batchError.item.itemType,
          path: batchError.item.path.toString().slice(origin.path.toString().length),
          errorMessage: batchError.error.translated_message
            || batchError.error.message
            || batchError.error.code,
        })));
        AuditLog.log(AuditLog.Action.MoveOrCopyFilesStartDone);
      })
      .finally(() => {
        setBatchProgressState({
          status: BatchTaskStatus.Ended,
        });
      });
  }

  const handleSubmitRenameFile: SubmitHandler<RenameFileFormData> = (data) => {
    if (!memoFileItem || !currentUser) {
      return;
    }
    let toPath = `${memoBasePath}${data.fileName}`;
    if (FileItem.isItemFolder(memoFileItem)) {
      toPath += "/";
    }
    const p = checkExists(toPath)
      .then(hasExisted => {
        if (hasExisted) {
          const confirmP = toggleReplaceConfirm(true);
          confirmP.finally(() => {
            toggleReplaceConfirm(false);
          });
          return confirmP;
        }
        return Promise.resolve(true);
      })
      .then(shouldContinue => {
        if (shouldContinue) {
          if (FileItem.isItemFolder(memoFileItem)) {
            return renameDirectory(memoFileItem, toPath);
          } else {
            return renameFile(memoFileItem, toPath);
          }
        }
        return Promise.reject();
      })
      .then(() => {
        if (FileItem.isItemFile(memoFileItem)) {
          modalProps.onHide?.();
        }
        onRenamedFile({
          originBasePath: memoBasePath,
        });
      });

    return toast.promise(p, {
      loading: translate("common.submitting"),
      success: translate("common.submitted"),
      error: err => `${translate("common.failed")}: ${err}`,
    });
  }

  const handleInterrupt = () => {
    stopMoveOrCopyFiles();
  }

  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-pencil me-1"/>
          {translate("modals.renameFile.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {
          !memoFileItem
            ? <div>
              {translate("common.noObjectSelected")}
            </div>
            : <>
              <Form
                className="mx-5"
                onSubmit={handleSubmit(handleSubmitRenameFile)}
              >
                <fieldset
                  className="grid-auto grid-form label-col-1"
                  disabled={isSubmitting || [BatchTaskStatus.Running, BatchTaskStatus.Ended].includes(batchProgressState.status)}
                >
                  <Form.Group as={Fragment} controlId="directoryName">
                    <Form.Label className="text-end">
                      {translate("modals.renameFile.form.baseDirectory.label")}
                    </Form.Label>
                    <div>
                      <Form.Control
                        plaintext
                        readOnly
                        defaultValue={`${memoBucketName}/${memoBasePath}`}
                      />
                    </div>
                  </Form.Group>
                  <Form.Group as={Fragment} controlId="fileName">
                    <Form.Label className="text-end">
                      {translate("modals.renameFile.form.fileName.label")}
                    </Form.Label>
                    <div>
                      <Form.Control
                        {...register("fileName", {
                          required: true,
                          validate: v => {
                            if (v === memoFileItem?.name) {
                              return false;
                            }
                            return FileRename.test(v);
                          }
                        })}
                        type="text"
                        isInvalid={Boolean(errors.fileName)}
                        autoFocus
                      />
                      <Form.Text
                        className={
                          Boolean(errors.fileName)
                            ? "text-danger"
                            : ""
                        }
                      >
                        {translate("modals.renameFile.form.fileName.hint")}
                      </Form.Text>
                    </div>
                  </Form.Group>
                </fieldset>
              </Form>
              {
                replaceConfirmState.isShowConfirm
                  ? <div className="d-flex">
                    <div>{translate("modals.renameFile.replaceConfirm.description")}</div>
                    <Button
                      className="ms-auto"
                      variant="lite-primary"
                      size="sm"
                      onClick={() => replaceConfirmState.handleConfirm(true)}
                    >
                      {translate("modals.renameFile.replaceConfirm.yes")}
                    </Button>
                    <Button
                      variant="lite-danger"
                      size="sm"
                      onClick={() => replaceConfirmState.handleConfirm(false)}
                    >
                      {translate("common.cancel")}
                    </Button>
                  </div>
                  : null
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
            </>
        }
      </Modal.Body>
      <Modal.Footer>
        {
          !memoFileItem || batchProgressState.status === BatchTaskStatus.Ended
            ? null
            : <Button
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              onClick={handleSubmit(handleSubmitRenameFile)}
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

export default RenameFile;
