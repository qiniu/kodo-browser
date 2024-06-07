import React, {Fragment, useEffect, useMemo, useState} from "react";
import {Button, Form, Modal, ModalProps, Spinner} from "react-bootstrap";
import {toast} from "react-hot-toast";
import {SubmitHandler, useForm} from "react-hook-form";

import StorageClass from "@common/models/storage-class";
import {BackendMode} from "@common/qiniu";

import {FileRename} from "@renderer/const/patterns";
import {Translate, useI18n} from "@renderer/modules/i18n";
import {useAuth} from "@renderer/modules/auth";
import {
  moveOrCopyFiles,
  FileItem,
  stopMoveOrCopyFiles,
  checkFileOrDirectoryExists
} from "@renderer/modules/qiniu-client";
import {useFileOperation} from "@renderer/modules/file-operation";
import * as AuditLog from "@renderer/modules/audit-log";

import {
  BatchProgress,
  BatchTaskStatus,
  ErroredFileOperation, ErrorFileList,
  useBatchProgress
} from "@renderer/components/batch-progress";
import {usePromiseConfirm} from "@renderer/components/lite-confirm";

import {OperationDoneRecallFn} from "../types";
import {isRecursiveDirectory} from "../utils"
import FileList from "../common/file-list";

interface MoveFilesProps {
  regionId: string,
  bucketName: string,
  basePath: string,
  fileItems: FileItem.Item[],
  originBasePath: string,
  storageClasses: StorageClass[],
  onMovedFile: OperationDoneRecallFn,
}

interface RenameFileFormData {
  fileName: string,
}

const MoveFiles: React.FC<ModalProps & MoveFilesProps> = (props) => {
  const {
    regionId,
    bucketName,
    basePath,
    fileItems,
    originBasePath,
    storageClasses,
    onMovedFile,
    ...modalProps
  } = props;

  const {translate} = useI18n();
  const contentI18nData = {
    operation: translate("common.move"),
  };

  const {currentUser} = useAuth();
  const {bucketPreferBackendMode: preferBackendMode} = useFileOperation();

  // form to rename for moving one file to same base path.
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
  });

  // replace confirm when rename form found the same name file already exists.
  const [replaceConfirmState, toggleReplaceConfirm] = usePromiseConfirm();

  // batch operation progress states
  const [batchProgressState, setBatchProgressState] = useBatchProgress();
  const [erroredFileOperations, setErroredFileOperations] = useState<ErroredFileOperation[]>([]);

  // cache operation states prevent props update after modal opened.
  const {
    memoFileItems,
    memoIsFiltered,
    memoIsRename,
    memoOriginBasePath,
    memoRegionId,
    memoBucketName,
    memoBasePath,
    memoStorageClasses,
  } = useMemo(() => {
    if (modalProps.show) {
      const isRename =
        fileItems.length === 1 &&
        fileItems[0].bucket === bucketName &&
        originBasePath === basePath;
      const filteredItems = fileItems.filter(item =>
        !isRecursiveDirectory(item, basePath) &&
        item.name?.length > 0
      );
      return {
        memoFileItems: filteredItems,
        memoIsFiltered: filteredItems.length !== fileItems.length,
        memoIsRename: isRename,
        memoOriginBasePath: originBasePath,
        memoRegionId: regionId,
        memoBucketName: bucketName,
        memoBasePath: basePath,
        memoStorageClasses: storageClasses,
      };
    } else {
      return {
        memoFileItems: [],
        memoIsFiltered: false,
        memoIsRename: false,
        memoOriginBasePath: originBasePath,
        memoRegionId: regionId,
        memoBucketName: bucketName,
        memoBasePath: basePath,
        memoStorageClasses: storageClasses,
      }
    }
  }, [modalProps.show]);

  // reset states when open/close modal.
  useEffect(() => {
    if (modalProps.show) {
      if (!memoFileItems.length) {
        return;
      }
      reset({
        fileName: memoIsRename ? fileItems[0].name : "",
      });
      if (!memoIsRename) {
        toggleReplaceConfirm(false);
      }
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
      endpointType: currentUser.endpointType,
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

  const moveFiles = (renameFilePath: string = "") => {
    if (!memoFileItems.length || !currentUser) {
      return Promise.resolve();
    }

    const opt = {
      id: currentUser.accessKey,
      secret: currentUser.accessSecret,
      endpointType: currentUser.endpointType,
      storageClasses: memoStorageClasses,
      preferKodoAdapter: preferBackendMode === BackendMode.Kodo,
      preferS3Adapter: preferBackendMode === BackendMode.S3,
    };
    setBatchProgressState({
      status: BatchTaskStatus.Running,
    });
    AuditLog.log(AuditLog.Action.MoveOrCopyFilesStart, {
      regionId: memoRegionId,
      from: memoFileItems.map(i => ({
        bucket: i.bucket,
        path: i.path.toString(),
      })),
      to: {
        bucket: memoBucketName,
        path: memoBasePath,
      },
      type: "move",
    });
    return moveOrCopyFiles(
      memoRegionId,
      memoFileItems,
      {
        bucket: memoBucketName,
        key: memoBasePath,
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
      renameFilePath, // rename if duplicateName !== ""
      opt,
    )
      .then(batchErrors => {
        setErroredFileOperations(batchErrors.map<ErroredFileOperation>(batchError => ({
          fileType: batchError.item.itemType,
          path: batchError.item.path.toString().slice(memoOriginBasePath.length),
          errorMessage: batchError.error.translated_message
            || batchError.error.message
            || batchError.error.code,
        })));
        onMovedFile({
          originBasePath: memoBasePath,
        });
        AuditLog.log(AuditLog.Action.MoveOrCopyFilesStartDone);
      })
      .finally(() => {
        setBatchProgressState({
          status: BatchTaskStatus.Ended,
        });
      });
  }

  const handleSubmitMoveFiles: SubmitHandler<RenameFileFormData> = (data) => {
    let p: Promise<void>;
    if (memoIsRename) {
      let renameFilePath = `${memoBasePath}${data.fileName}`;
      if (FileItem.isItemFolder(memoFileItems[0])) {
        renameFilePath += "/";
      }
      p = checkExists(renameFilePath)
        .then(hasExisted => {
          if (!hasExisted) {
            return Promise.resolve(true);
          }
          const confirmP = toggleReplaceConfirm(true);
          confirmP.finally(() => {
            toggleReplaceConfirm(false);
          });
          return confirmP;
        })
        .then(shouldContinue => {
          if (!shouldContinue) {
            return Promise.reject();
          }
          return moveFiles(renameFilePath);
        });
    } else {
      p = moveFiles();
    }
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
          <i className="bi bi-scissors me-1"/>
          {translate("modals.moveFiles.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0">
        {
          memoIsFiltered &&
          <div className="text-bg-warning bg-opacity-25 px-3 py-1">
            {translate("modals.moveFiles.hintFiltered")}
          </div>
        }
        <div className="p-3">
          {
            !memoFileItems.length
              ? <div>
                {translate("common.noObjectSelected")}
              </div>
              : <>
                {
                  memoIsRename
                    ? <>
                      <Form
                        className="mx-5"
                        onSubmit={handleSubmit(handleSubmitMoveFiles)}
                      >
                        <fieldset
                          className="grid-auto grid-form label-col-1"
                          disabled={isSubmitting || [BatchTaskStatus.Running, BatchTaskStatus.Ended].includes(batchProgressState.status)}
                        >
                          <Form.Group as={Fragment} controlId="fileName">
                            <Form.Label className="text-end" column >
                              {translate("modals.moveFiles.form.fileName.label")}
                            </Form.Label>
                            <div>
                              <Form.Control
                                {...register("fileName", {
                                  validate: v => {
                                    if (!memoIsRename) {
                                      return true;
                                    }
                                    if (!v) {
                                      return false;
                                    }
                                    if (v === memoFileItems[0].name) {
                                      return false;
                                    }
                                    return FileRename.test(v);
                                  },
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
                                {translate("modals.moveFiles.form.fileName.hint")}
                              </Form.Text>
                            </div>
                          </Form.Group>
                        </fieldset>
                      </Form>
                      {
                        replaceConfirmState.isShowConfirm
                          ? <div className="d-flex">
                            <div>{translate("modals.moveFiles.replaceConfirm.description")}</div>
                            <Button
                              className="ms-auto"
                              variant="lite-primary"
                              size="sm"
                              onClick={() => replaceConfirmState.handleConfirm(true)}
                            >
                              {translate("modals.moveFiles.replaceConfirm.yes")}
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
                    </>
                    : <>

                      <FileList
                        className="scroll-max-vh-40"
                        data={memoFileItems}
                        prefixDescription={
                          <div>
                            <Translate
                              i18nKey="modals.moveFiles.prefixDescription"
                              data={contentI18nData}
                              slots={{
                                operation: v => <code key="operation">{v}</code>,
                              }}
                            />
                          </div>
                        }
                        description={
                          <div>
                            <Translate
                              i18nKey="modals.moveFiles.description"
                              data={contentI18nData}
                              slots={{
                                operation: v => <code key="operation">{v}</code>,
                              }}
                            />
                          </div>
                        }
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
              </>
          }
        </div>
      </Modal.Body>
      <Modal.Footer>
        {
          !memoFileItems.length || batchProgressState.status === BatchTaskStatus.Ended
            ? null
            : <Button
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              onClick={handleSubmit(handleSubmitMoveFiles)}
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

export default MoveFiles;
