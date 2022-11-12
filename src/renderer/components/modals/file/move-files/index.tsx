import React, {useEffect, useMemo, useState} from "react";
import {Button, Col, Form, Modal, ModalProps, Row, Spinner} from "react-bootstrap";
import {toast} from "react-hot-toast";
import {SubmitHandler, useForm} from "react-hook-form";

import StorageClass from "@common/models/storage-class";
import {FileRename} from "@renderer/const/patterns";
import {Translate, useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {
  moveOrCopyFiles,
  FileItem,
  stopMoveOrCopyFiles,
  checkFileOrDirectoryExists
} from "@renderer/modules/qiniu-client";
import {isItemFolder} from "@renderer/modules/qiniu-client/file-item";
import * as AuditLog from "@renderer/modules/audit-log";

import {
  BatchProgress,
  BatchTaskStatus,
  ErroredFileOperation, ErrorFileList,
  useBatchProgress
} from "@renderer/components/batch-progress";
import {usePromiseConfirm} from "@renderer/components/lite-confirm";

import {OperationDoneRecallFn} from "@renderer/components/modals/file/types";

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
    memoIsRename,
    // memoOriginBasePath,
    memoRegionId,
    memoBucketName,
    memoBasePath,
    memoStorageClasses,
  } = useMemo(() => {
    if (modalProps.show) {
      const isRename = fileItems.length === 1 && originBasePath === basePath;
      return {
        memoFileItems: fileItems,
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
      isPublicCloud: currentUser.endpointType === EndpointType.Public,
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
      isPublicCloud: currentUser.endpointType === EndpointType.Public,
      storageClasses: memoStorageClasses,
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
          path: batchError.item.path.toString().slice(memoBasePath.length),
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
      if (isItemFolder(memoFileItems[0])) {
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
      <Modal.Body>
        {
          !memoFileItems.length
            ? <div>
              {translate("common.noOperationalObject")}
            </div>
            : <>
              {
                memoIsRename
                  ? <>
                    <Form onSubmit={handleSubmit(handleSubmitMoveFiles)}>
                      <fieldset
                        disabled={isSubmitting || [BatchTaskStatus.Running, BatchTaskStatus.Ended].includes(batchProgressState.status)}
                      >
                        <Form.Group as={Row} className="mb-3" controlId="fileName">
                          <Form.Label className="text-end" column sm={4}>
                            {translate("modals.moveFiles.form.fileName.label")}
                          </Form.Label>
                          <Col sm={7}>
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
                          </Col>
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
                    <div>
                      <Translate
                        i18nKey="modals.moveFiles.description"
                        data={contentI18nData}
                        slots={{
                          operation: v => <code key="operation">{v}</code>,
                        }}
                      />
                    </div>
                    <ul className="scroll-max-vh-40">
                      {
                        memoFileItems.map(fileItem => (
                          <li key={fileItem.path.toString()}>
                            {
                              isItemFolder(fileItem)
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
            </>
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
