import React, {useEffect, useMemo, useState} from "react";
import {Button, Col, Form, Modal, ModalProps, Row, Spinner} from "react-bootstrap";
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
  checkFileOrDirectoryExists,
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

interface CopyFilesProps {
  regionId: string,
  bucketName: string,
  basePath: string,
  fileItems: FileItem.Item[],
  originBasePath: string,
  storageClasses: StorageClass[],
  onCopiedFile: OperationDoneRecallFn,
}

interface DuplicateFileFormData {
  fileName: string,
}

const CopyFiles: React.FC<ModalProps & CopyFilesProps> = (props) => {
  const {
    regionId,
    bucketName,
    basePath,
    fileItems,
    originBasePath,
    storageClasses,
    onCopiedFile,
    ...modalProps
  } = props;

  const {translate} = useI18n();
  const contentI18nData = {
    operation: translate("common.copy"),
  };

  const {currentUser} = useAuth();
  const {bucketPreferBackendMode: preferBackendMode} = useFileOperation();

  // form to create a duplication for copying one file to same base path.
  const {
    handleSubmit,
    register,
    reset,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<DuplicateFileFormData>({
    mode: "onChange",
  });

  // replace confirm when create duplication form found the same name file already exists.
  const [replaceConfirmState, toggleReplaceConfirm] = usePromiseConfirm();

  // batch operation progress states
  const [batchProgressState, setBatchProgressState] = useBatchProgress();
  const [erroredFileOperations, setErroredFileOperations] = useState<ErroredFileOperation[]>([]);

  // cache operation states prevent props update after modal opened.
  const {
    memoFileItems,
    memoIsFiltered,
    memoIsDuplication,
    memoOriginBasePath,
    memoRegionId,
    memoBucketName,
    memoBasePath,
    memoStorageClasses,
  } = useMemo(() => {
    if (modalProps.show) {
      const isDuplication =
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
        memoIsDuplication: isDuplication,
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
        memoIsDuplication: false,
        memoOriginBasePath: originBasePath,
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
      if (!memoFileItems.length) {
        return;
      }
      reset({
        fileName: memoIsDuplication ? memoFileItems[0].name : "",
      });
      if (!memoIsDuplication) {
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

  const copyFiles = (duplicateFilePath: string = "") => {
    if (!memoFileItems.length || !currentUser) {
      return Promise.reject();
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
      type: "copy",
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
      true,
      duplicateFilePath, // rename if duplicateName !== ""
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
        onCopiedFile({
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

  const handleSubmitCopyFiles: SubmitHandler<DuplicateFileFormData> = (data) => {
    let p: Promise<void>;
    // if create a duplication
    if (memoIsDuplication) {
      let duplicationFile = `${memoBasePath}${data.fileName}`;
      if (FileItem.isItemFolder(memoFileItems[0])) {
        duplicationFile += "/";
      }
      p = checkExists(duplicationFile)
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
          return copyFiles(duplicationFile);
        });
    } else {
      p = copyFiles();
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
          <i className="fa fa-clone me-1"/>
          {translate("modals.copyFiles.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0">
        {
          memoIsFiltered &&
          <div className="text-bg-warning bg-opacity-25 px-3 py-1">
            {translate("modals.copyFiles.hintFiltered")}
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
                  memoIsDuplication
                    ? <>
                      <Form onSubmit={handleSubmit(handleSubmitCopyFiles)}>
                        <fieldset
                          disabled={isSubmitting || [BatchTaskStatus.Running, BatchTaskStatus.Ended].includes(batchProgressState.status)}
                        >
                          <Form.Group as={Row} className="mb-3" controlId="fileName">
                            <Form.Label className="text-end" column sm={4}>
                              {translate("modals.copyFiles.form.fileName.label")}
                            </Form.Label>
                            <Col sm={7}>
                              <Form.Control
                                {...register("fileName", {
                                  validate: v => {
                                    if (!memoIsDuplication) {
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
                                {translate("modals.copyFiles.form.fileName.hint")}
                              </Form.Text>
                            </Col>
                          </Form.Group>
                        </fieldset>
                      </Form>
                      {
                        replaceConfirmState.isShowConfirm
                          ? <div className="d-flex">
                            <div>{translate("modals.copyFiles.replaceConfirm.description")}</div>
                            <Button
                              className="ms-auto"
                              variant="lite-primary"
                              size="sm"
                              onClick={() => replaceConfirmState.handleConfirm(true)}
                            >
                              {translate("modals.copyFiles.replaceConfirm.yes")}
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
                              i18nKey="modals.copyFiles.prefixDescription"
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
                              i18nKey="modals.copyFiles.description"
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
              onClick={handleSubmit(handleSubmitCopyFiles)}
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

export default CopyFiles;
