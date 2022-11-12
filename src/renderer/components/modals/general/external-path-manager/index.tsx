import React, {useEffect} from "react";
import {Button, Col, Form, Modal, ModalProps, Row, Spinner, Table} from "react-bootstrap";
import {SubmitHandler, useForm} from "react-hook-form";
import {toast} from "react-hot-toast";

import {ADDR_KODO_PROTOCOL} from "@renderer/const/kodo-nav";
import {useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {ExternalPathItem, useKodoExternalPath} from "@renderer/modules/kodo-address";
import {listFiles} from "@renderer/modules/qiniu-client";
import useLoadRegions from "@renderer/modules/qiniu-client-hooks/use-load-regions";
import * as AuditLog from "@renderer/modules/audit-log";

import EmptyHolder from "@renderer/components/empty-holder";
import TooltipText from "@renderer/components/tooltip-text";

import ExternalPathTableRow from "./external-path-table-row";

interface AddExternalPathFormDate {
  path: string,
  regionId: string,
}

interface ExternalPathManagerProps {
  onActiveExternalPath: (externalPath: ExternalPathItem) => void,
}

const ExternalPathManager: React.FC<ModalProps & ExternalPathManagerProps> = ({
  onActiveExternalPath,
  ...modalProps
}) => {
  const {currentLanguage, translate} = useI18n();
  const {currentUser} = useAuth();

  // external path
  const {
    externalPathState: {
      kodoExternalPath,
      externalPaths,
    },
    setExternalPaths,
  } = useKodoExternalPath(currentUser);

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

  const handleAddExternalPath: SubmitHandler<AddExternalPathFormDate> = (data) => {
    if (externalPaths.some(externalPath =>
      externalPath.regionId === data.regionId &&
      externalPath.path === data.path
    )) {
      toast.error(translate("modals.externalPathManager.error.duplicated"));
      return;
    }

    if (!currentUser) {
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
      kodoExternalPath?.addExternalPath({
        regionId: data.regionId,
        protocol: ADDR_KODO_PROTOCOL,
        path: data.path,
      });
      setExternalPaths(kodoExternalPath?.read().list ?? []);
      reset();
      AuditLog.log(AuditLog.Action.AddExternalPath, {
        regionId: data.regionId,
        path: ADDR_KODO_PROTOCOL + data.path,
      });
    });

    return toast.promise(p, {
      loading: translate("common.submitting"),
      success: translate("common.submitted"),
      error: err => `${translate("common.failed")}: ${err}`,
    });
  };

  // load regions
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

  // event handler
  const handleActivePath = (item: ExternalPathItem) => {
    onActiveExternalPath(item);
    modalProps.onHide?.();
  };

  const handleDeletePath = (item: ExternalPathItem) => {
    kodoExternalPath?.deleteExternalPath(item);
    setExternalPaths(kodoExternalPath?.read().list ?? []);
    AuditLog.log(AuditLog.Action.DeleteExternalPath, {
      regionId: item.regionId,
      fullPath: item.protocol + item.path,
    });
  };

  // reset state when open/close modal
  useEffect(() => {
    if (modalProps.show) {
      reset();
    } else {
    }
  }, [modalProps.show]);

  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-signpost-2-fill me-1"/>
          {translate("modals.externalPathManager.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form
          className="mb-3"
          onSubmit={handleSubmit(handleAddExternalPath)}
        >
          <fieldset disabled={isSubmitting || loadRegionsState.loading}>
            <Row>
              <Col sm={4}>
                <Form.Group as={Row} className="align-items-center" controlId="regionId">
                  <Form.Label className="text-end p-0" column sm={4}>
                    {translate("modals.externalPathManager.form.region.label")}
                  </Form.Label>
                  <Col sm={8}>
                    {
                      loadRegionsState.regions.length > 0
                        ? (
                          <>
                            <Form.Select
                              {...register("regionId", {
                                required: translate("modals.externalPathManager.form.region.feedback.required"),
                              })}
                              size="sm"
                              isInvalid={Boolean(errors.regionId)}
                            >
                              {loadRegionsState.regions.map(r => (
                                <option key={r.s3Id} value={r.s3Id}>
                                  {r.translatedLabels?.[currentLanguage] ?? r.label}
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
              </Col>
              <Col sm={6}>
                <Form.Group as={Row} className="align-items-center" controlId="path">
                  <Form.Label className="text-end p-0" column sm={3}>
                    <TooltipText
                      tooltipContent={translate("modals.externalPathManager.form.path.hint")}
                    >
                      <i className="bi bi-question-circle-fill me-1 text-secondary"/>
                    </TooltipText>
                    {translate("modals.externalPathManager.form.path.label")}
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control
                      {...register("path", {
                        required: translate("modals.externalPathManager.form.path.feedback.required"),
                      })}
                      size="sm"
                      type="text"
                      placeholder={translate("modals.externalPathManager.form.path.holder")}
                      isInvalid={Boolean(errors.path)}
                    />
                  </Col>
                </Form.Group>
              </Col>
              <Col sm={2}>
                <Button size="sm" type="submit">
                  {translate("modals.externalPathManager.addButton")}
                </Button>
              </Col>
            </Row>
          </fieldset>
        </Form>
        <div className="scroll-max-vh-40 scroll-shadow position-relative">
          <Table bordered striped hover size="sm">
            <thead className="sticky-top bg-body">
            <tr>
              <th>{translate("modals.externalPathManager.table.path")}</th>
              <th>{translate("modals.externalPathManager.table.regionName")}</th>
              <th>{translate("modals.externalPathManager.table.operation")}</th>
            </tr>
            </thead>
            <tbody>
            {
              externalPaths.length
                ? externalPaths.map(item => (
                  <ExternalPathTableRow
                    key={item.protocol + item.path}
                    regions={loadRegionsState.regions}
                    data={item}
                    onActive={handleActivePath}
                    onDelete={handleDeletePath}
                  />
                ))
                : <EmptyHolder col={3}/>
            }
            </tbody>
          </Table>
        </div>
      </Modal.Body>
    </Modal>
  )
};

export default ExternalPathManager;
