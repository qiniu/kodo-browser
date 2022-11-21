import React, {useEffect, useMemo, useState} from "react";
import {Button, Modal, ModalProps} from "react-bootstrap";
import {SubmitHandler, useForm} from "react-hook-form";

import {BackendMode} from "@common/qiniu"

import usePortal from "@renderer/modules/hooks/use-portal";
import {useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {FileItem, signatureUrl} from "@renderer/modules/qiniu-client";
import {DomainAdapter, NON_OWNED_DOMAIN, useLoadDomains} from "@renderer/modules/qiniu-client-hooks";
import {useFileOperation} from "@renderer/modules/file-operation";

import {
  GenerateLinkForm,
  GenerateLinkFormData,
  GenerateLinkSubmitData,
} from "@renderer/components/forms";

interface GenerateFileLinkProps {
  regionId: string,
  bucketName: string,
  fileItem: FileItem.File | null,
  canS3Domain: boolean,
  defaultDomain?: DomainAdapter,
}

const GenerateFileLink: React.FC<ModalProps & GenerateFileLinkProps> = ({
  regionId,
  bucketName,
  fileItem,
  canS3Domain,
  defaultDomain,
  ...modalProps
}) => {
  const {translate} = useI18n();
  const {currentUser} = useAuth();
  const {bucketPreferBackendMode: preferBackendMode} = useFileOperation();

  // cache operation states prevent props update after modal opened.
  const {
    memoFileItem,
    memoRegionId,
    memoBucketName,
    memoCanS3Domain,
    memoDefaultDomain,
  } = useMemo(() => ({
    memoFileItem: fileItem,
    memoRegionId: regionId,
    memoBucketName: bucketName,
    memoCanS3Domain: canS3Domain,
    memoDefaultDomain: defaultDomain,
  }), [modalProps.show]);

  // domains loader
  const {
    loadDomainsState: {
      loading: loadingDomains,
      domains,
    },
    loadDomains,
  } = useLoadDomains({
    user: currentUser,
    regionId: memoRegionId,
    bucketName: memoBucketName,
    canS3Domain: memoCanS3Domain,
    preferBackendMode,
  });

  // state when generate succeed
  const [fileLink, setFileLink] = useState<string>();

  // form for generating file link
  const generateLinkFormController = useForm<GenerateLinkFormData>({
    mode: "onChange",
    defaultValues: {
      domainName: memoDefaultDomain?.name ?? NON_OWNED_DOMAIN.name,
      expireAfter: 600,
    },
  });

  const {reset} = generateLinkFormController;

  const handleSubmitGenerateFileLink: SubmitHandler<GenerateLinkSubmitData> = (data) => {
    if (!memoFileItem || !currentUser) {
      return;
    }

    const opt = {
      id: currentUser.accessKey,
      secret: currentUser.accessSecret,
      isPublicCloud: currentUser.endpointType === EndpointType.Public,
      preferKodoAdapter: preferBackendMode === BackendMode.Kodo,
      preferS3Adapter:
        preferBackendMode === BackendMode.S3 ||
        data.domain?.backendMode === BackendMode.S3,
    };

    const domain = data.domain?.name === NON_OWNED_DOMAIN.name
      ? undefined
      : data.domain;

    return signatureUrl(
      memoRegionId,
      memoBucketName,
      memoFileItem.path.toString(),
      domain,
      data.expireAfter,
      opt,
    )
      .then(fileUrl => {
        setFileLink(fileUrl.toString());
      });
  };

  const {ref: submitButtonRef, portal: submitButtonPortal} = usePortal();

  // reset states when open/close modal
  useEffect(() => {
    if (modalProps.show) {
      reset({
        domainName: memoDefaultDomain?.name ?? NON_OWNED_DOMAIN.name,
      });
    } else {
      setFileLink(undefined);
    }
  }, [modalProps.show]);

  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-link-45deg me-1"/>
          {translate("modals.generateFileLink.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {
          !memoFileItem
            ? <div>
              {translate("common.noObjectSelected")}
            </div>
            : <GenerateLinkForm
              fileName={memoFileItem.name}
              fileLink={fileLink}
              formController={generateLinkFormController}
              loadingDomains={loadingDomains}
              domains={domains}
              defaultDomain={memoDefaultDomain}
              onReloadDomains={loadDomains}
              onSubmit={handleSubmitGenerateFileLink}
              submitButtonPortal={submitButtonPortal}
            />
        }
      </Modal.Body>
      <Modal.Footer>
        {
          !memoFileItem
            ? null
            : <span ref={submitButtonRef}/>
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

export default GenerateFileLink;
