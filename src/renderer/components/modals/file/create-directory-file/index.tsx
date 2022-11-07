import React, {useEffect, useMemo} from "react";
import {Button, Col, Form, Modal, ModalProps, Row, Spinner} from "react-bootstrap";
import {toast} from "react-hot-toast";
import {SubmitHandler, useForm} from "react-hook-form";
import * as qiniuPathConvertor from "qiniu-path/dist/src/convert";

import {DirectoryName} from "@renderer/const/patterns";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {useI18n} from "@renderer/modules/i18n";
import {createFolder} from "@renderer/modules/qiniu-client";

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
      isPublicCloud: currentUser.endpointType === EndpointType.Public,
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
    });
    return toast.promise(p, {
      loading: translate("common.submitting"),
      success: translate("common.submitted"),
      error: translate("common.failed"),
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
          <fieldset disabled={isSubmitting}>
            <Form.Group as={Row} className="mb-3" controlId="directoryName">
              <Form.Label className="text-end" column sm={4}>
                {translate("modals.createDirectory.form.directoryName.label")}
              </Form.Label>
              <Col sm={7}>
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
              </Col>
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
