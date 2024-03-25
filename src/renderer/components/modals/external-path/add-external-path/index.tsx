import React, {Fragment, useEffect} from "react";
import {Button, Form, Modal, ModalProps, Spinner} from "react-bootstrap";
import {SubmitHandler, useForm} from "react-hook-form";
import {toast} from "react-hot-toast";

import {ADDR_KODO_PROTOCOL} from "@renderer/const/kodo-nav";

import {useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import * as AuditLog from "@renderer/modules/audit-log";
import {useExternalPath} from "@renderer/modules/user-config-store";
import {listFiles} from "@renderer/modules/qiniu-client";
import {useLoadRegions} from "@renderer/modules/qiniu-client-hooks";

interface AddExternalPathFormDate {
  path: string,
  regionId: string,
}

interface AddExternalPathProps {
  onAddedExternalPath?: () => void,
}

const AddExternalPath: React.FC<ModalProps & AddExternalPathProps> = ({
  onAddedExternalPath,
  ...modalProps
}) => {
  const {currentLanguage, translate} = useI18n();
  const {currentUser} = useAuth();

  // load regions
  const {
    loadRegionsState,
  } = useLoadRegions({
    user: currentUser,
    shouldAutoReload: true,
  });
  useEffect(() => {
    if (!loadRegionsState.regions.length) {
      return;
    }
    reset({
      regionId: loadRegionsState.regions[0].s3Id,
    });
  }, [loadRegionsState.regions]);

  // reset form when modal show change
  useEffect(() => {
    reset();
  }, [modalProps.show]);

  // external path
  const {
    externalPathState,
    hasExternalPath,
    addExternalPath,
    loadExternalPaths,
  } = useExternalPath(currentUser);

  // add external path form
  const {
    handleSubmit,
    register,
    reset,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<AddExternalPathFormDate>();

  const handleAddExternalPath: SubmitHandler<AddExternalPathFormDate> = async (data) => {
    if (!currentUser) {
      return;
    }

    if (!externalPathState.initialized) {
      await loadExternalPaths();
    }

    if (hasExternalPath({
      protocol: ADDR_KODO_PROTOCOL,
      regionId: data.regionId,
      path: data.path,
    })) {
      toast.error(translate("modals.addExternalPath.error.duplicated"));
      return;
    }

    const [bucketId] = data.path.split("/", 1);
    const prefix = data.path.slice(`${bucketId}/`.length);

    const opt = {
      id: currentUser.accessKey,
      secret: currentUser.accessSecret,
      isPublicCloud: currentUser.endpointType === EndpointType.Public,
      preferS3Adapter: true,
      maxKeys: 1,
      minKeys: 0,
      storageClasses: [],
    };
    const p = listFiles(
      data.regionId,
      bucketId,
      prefix,
      undefined,
      opt,
    );

    p.then(() => {
      return addExternalPath({
        regionId: data.regionId,
        protocol: ADDR_KODO_PROTOCOL,
        path: data.path,
      });
    })
      .then(() => {
        reset();
        AuditLog.log(AuditLog.Action.AddExternalPath, {
          regionId: data.regionId,
          path: ADDR_KODO_PROTOCOL + data.path,
        });
        onAddedExternalPath?.();
        modalProps.onHide?.();
      });

    return toast.promise(p, {
      loading: translate("common.submitting"),
      success: translate("common.submitted"),
      error: err => `${translate("common.failed")}: ${err}`,
    });
  };
  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-signpost-2-fill text-brown me-1"/>
          {translate("modals.addExternalPath.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form className="mx-5" onSubmit={handleSubmit(handleAddExternalPath)}>
          <fieldset
            className="grid-auto grid-form label-col-1"
            disabled={isSubmitting || loadRegionsState.loading}
          >
            <Form.Group
              as={Fragment}
              controlId="regionId"
            >
              <Form.Label className="text-end">
                {translate("modals.addExternalPath.form.region.label")}
              </Form.Label>
              <div>
                {
                  loadRegionsState.loading
                    ? (
                      <Spinner className="me-2" animation="border" size="sm"/>
                    )
                    : (
                      <>
                        <Form.Select
                          {...register("regionId", {
                            required: translate("modals.addExternalPath.form.region.feedback.required"),
                          })}
                          size="sm"
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
                }
              </div>
            </Form.Group>
            <Form.Group
              as={Fragment}
              controlId="path"
            >
              <Form.Label className="text-end">
                {translate("modals.addExternalPath.form.path.label")}
              </Form.Label>
              <div>
                <Form.Control
                  {...register("path", {
                    required: translate("modals.addExternalPath.form.path.feedback.required"),
                  })}
                  size="sm"
                  type="text"
                  placeholder={translate("modals.addExternalPath.form.path.holder")}
                  isInvalid={Boolean(errors.path)}
                />
                <Form.Text>
                  {translate("modals.addExternalPath.form.path.hint")}
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
          onClick={handleSubmit(handleAddExternalPath)}
        >
          {isSubmitting ? translate("common.submitting") : translate("modals.addExternalPath.submit")}
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

export default AddExternalPath;
