import React, {useEffect} from "react";
import {Button, Col, Form, Modal, ModalProps, Row, Spinner} from "react-bootstrap";
import {toast} from "react-hot-toast";
import {SubmitHandler, useForm} from "react-hook-form";

import ACL from "@renderer/const/acl";
import {BackendMode} from "@common/qiniu";

import {BucketName as BucketNamePattern} from "@renderer/const/patterns";
import {useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {createBucket} from "@renderer/modules/qiniu-client";
import useLoadRegions from "@renderer/modules/qiniu-client-hooks/use-load-regions";
import * as AuditLog from "@renderer/modules/audit-log";
import {useFileOperation} from "@renderer/modules/file-operation";

interface CreateBucketProps {
  onCreatedBucket: () => void,
}

interface CreateBucketFormData {
  name: string,
  regionId: string,
  acl: ACL,
}

const CreateBucket: React.FC<ModalProps & CreateBucketProps> = ({
  onCreatedBucket,
  ...modalProps
}) => {
  const {currentLanguage, translate} = useI18n();
  const {currentUser} = useAuth();
  const {bucketPreferBackendMode: preferBackendMode} = useFileOperation();

  const {
    handleSubmit,
    register,
    reset,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<CreateBucketFormData>({
    defaultValues: {
      name: "",
      regionId: "",
      acl: ACL.PublicRead,
    }
  });

  const {
    loadRegionsState,
  } = useLoadRegions({
    user: currentUser,
  });
  useEffect(() => {
    if (!loadRegionsState.regions.length) {
      return;
    }
    reset({
      regionId: loadRegionsState.regions[0].s3Id,
    });
  }, [loadRegionsState.regions]);

  useEffect(() => {
    reset();
  }, [modalProps.show]);

  const handleSubmitCreateBucket: SubmitHandler<CreateBucketFormData> = (data) => {
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
    const p = createBucket(
      data.regionId,
      data.name,
      opt,
    );
    p.then(() => {
      onCreatedBucket();
      modalProps.onHide?.();
      AuditLog.log(AuditLog.Action.AddBucket, data);
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
          <i className="fa fa-database me-1"/>
          {translate("modals.createBucket.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <fieldset disabled={isSubmitting || loadRegionsState.loading}>
            <Form.Group as={Row} className="mb-3" controlId="bucketName">
              <Form.Label className="text-end" column sm={3}>
                {translate("modals.createBucket.form.bucketName.label")}
              </Form.Label>
              <Col sm={9}>
                <Form.Control
                  {...register("name", {
                    required: translate("modals.createBucket.form.bucketName.feedback.required"),
                    pattern: {
                      value: BucketNamePattern,
                      message: translate("modals.createBucket.form.bucketName.feedback.pattern"),
                    },
                  })}
                  type="text"
                  placeholder={translate("modals.createBucket.form.bucketName.holder")}
                  isInvalid={Boolean(errors.name)}
                />
                <Form.Text>
                  {translate("modals.createBucket.form.bucketName.tips")}
                </Form.Text>
                <Form.Control.Feedback type="invalid">
                  {errors.name?.message}
                </Form.Control.Feedback>
              </Col>
            </Form.Group>
            <Form.Group as={Row} className="mb-3" controlId="regionId">
              <Form.Label className="text-end" column sm={3}>
                {translate("modals.createBucket.form.region.label")}
              </Form.Label>
              <Col sm={9}>
                {
                  loadRegionsState.regions.length > 0
                    ? (
                      <>
                        <Form.Select
                          {...register("regionId", {
                            required: translate("modals.createBucket.form.region.feedback.required"),
                          })}
                          isInvalid={Boolean(errors.regionId)}
                        >
                          {loadRegionsState.regions.map(r => (
                            <option key={r.s3Id} value={r.s3Id}>
                              {/* may empty string, so use `||` instead of `??` */}
                              {r.translatedLabels?.[currentLanguage] || r.label || r.s3Id}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors.regionId?.message}
                        </Form.Control.Feedback>
                      </>
                    )
                    : (
                      <Spinner className="me-2" animation="border" size="sm"/>
                    )
                }
              </Col>
            </Form.Group>
            <Form.Group as={Row} className="mb-3" controlId="acl">
              <Form.Label className="text-end" column sm={3}>
                {translate("modals.createBucket.form.acl.label")}
              </Form.Label>
              <Col sm={9}>
                <Form.Select
                  isInvalid={Boolean(errors.acl)}
                  disabled
                >
                  <option value={ACL.PublicRead}>{translate("modals.createBucket.form.acl.options.publicRead")}</option>
                </Form.Select>
                <Form.Control
                  {...register("acl", {
                    required: translate("modals.createBucket.form.acl.feedback.required"),
                    value: ACL.PublicRead,
                  })}
                  hidden
                  readOnly
                />
                <Form.Control.Feedback type="invalid">
                  {errors.acl?.message}
                </Form.Control.Feedback>
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
          onClick={handleSubmit(handleSubmitCreateBucket)}
        >
          {isSubmitting ? translate("common.submitting") : translate("common.submit")}
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
  )
};

export default CreateBucket;
