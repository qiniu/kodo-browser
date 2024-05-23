import React, {Fragment, useEffect, useMemo} from "react";
import {Button, Form, Modal, ModalProps, Spinner} from "react-bootstrap";
import {toast} from "react-hot-toast";
import {SubmitHandler, useForm} from "react-hook-form";
import * as qiniuPathConvertor from "qiniu-path/dist/src/convert";

import {BackendMode} from "@common/qiniu";

import {DirectoryName} from "@renderer/const/patterns";
import {useAuth} from "@renderer/modules/auth";
import {useI18n} from "@renderer/modules/i18n";
import {createFolder} from "@renderer/modules/qiniu-client";
import {useFileOperation} from "@renderer/modules/file-operation";
import * as AuditLog from "@renderer/modules/audit-log";

import {OperationDoneRecallFn} from "../types";

interface CreateDirectoryFileProps {
  regionId: string,
  bucketName: string,
  basePath: string,
  onCreatedDirectory: OperationDoneRecallFn,
}

interface CreateDirectoryFileFormData {
  directoryName: string,
}

const CreateDirectoryFile: React.FC<ModalProps & CreateDirectoryFileProps> = (props) => {
  const {
    regionId,
    bucketName,
    basePath,
    onCreatedDirectory,
    ...modalProps
  } = props;

  const {translate} = useI18n();
  const {currentUser} = useAuth();
  const {bucketPreferBackendMode: preferBackendMode} = useFileOperation();

  // cache operation states prevent props update after modal opened.
  const {
    memoRegionId,
    memoBucketName,
    memoBasePath,
  } = useMemo(() => ({
    memoRegionId: regionId,
    memoBucketName: bucketName,
    memoBasePath: basePath,
  }), [modalProps.show]);

  const {
    handleSubmit,
    register,
    reset,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<CreateDirectoryFileFormData>({
    mode: "onChange",
  });

  useEffect(() => {
    if (modalProps.show) {
      reset();
    } else {
    }
  }, [modalProps.show]);

  const handleSubmitCreateDirectoryFile: SubmitHandler<CreateDirectoryFileFormData> = (data) => {
    if (!currentUser) {
      return;
    }

    const opt = {
      id: currentUser.accessKey,
      secret: currentUser.accessSecret,
      endpointType: currentUser.endpointType,
      preferKodoAdapter: preferBackendMode === BackendMode.Kodo,
      preferS3Adapter: preferBackendMode === BackendMode.S3,
    }
    const prefix = qiniuPathConvertor.fromQiniuPath(`${memoBasePath}${data.directoryName}/`);

    const p = createFolder(
      memoRegionId,
      memoBucketName,
      prefix,
      opt,
    );
    p.then(() => {
      onCreatedDirectory({
        originBasePath: memoBasePath,
      });
      modalProps.onHide?.();
      AuditLog.log(AuditLog.Action.AddFolder, {
        regionId: memoRegionId,
        bucket: memoBucketName,
        path: prefix.toString(),
      });
    });
    return toast.promise(p, {
      loading: translate("common.submitting"),
      success: translate("common.submitted"),
      error: err => `${translate("common.failed")}: ${err}`,
    });
  }

  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-folder-fill me-1 text-yellow"/>
          {translate("modals.createDirectory.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit(handleSubmitCreateDirectoryFile)}>
          <fieldset
            className="grid-auto grid-form label-col-1"
            disabled={isSubmitting}
          >
            <Form.Group as={Fragment} controlId="directoryName">
              <Form.Label className="text-end">
                {translate("modals.createDirectory.form.directoryName.label")}
              </Form.Label>
              <div>
                <Form.Control
                  {...register("directoryName", {
                    required: true,
                    pattern: DirectoryName,
                  })}
                  type="text"
                  isInvalid={Boolean(errors.directoryName)}
                />
                <Form.Text
                  className={
                    Boolean(errors.directoryName)
                      ? "text-danger"
                      : ""
                  }
                >
                  {translate("modals.createDirectory.form.directoryName.hint")}
                </Form.Text>
              </div>
            </Form.Group>
          </fieldset>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="primary"
          size="sm"
          disabled={isSubmitting}
          onClick={handleSubmit(handleSubmitCreateDirectoryFile)}
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

export default CreateDirectoryFile;
