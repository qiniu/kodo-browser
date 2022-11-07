import React, {useEffect, useMemo, useState} from "react";
import {Button, Modal, ModalProps} from "react-bootstrap";
import {SubmitHandler, useForm} from "react-hook-form";
import {Domain} from "kodo-s3-adapter-sdk/dist/adapter";

import usePortal from "@renderer/modules/hooks/use-portal";
import {FileItem, signatureUrl} from "@renderer/modules/qiniu-client";
import {useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {useLoadDomains} from "@renderer/modules/qiniu-client-hooks";

import {
  GenerateLinkForm,
  GenerateLinkFormData,
  GenerateLinkSubmitData,
  NON_OWNED_DOMAIN
} from "@renderer/components/forms";

interface GenerateFileLinkProps {
  regionId: string,
  bucketName: string,
  fileItem: FileItem.File | null,
  defaultDomain?: Domain,
}

const GenerateFileLink: React.FC<ModalProps & GenerateFileLinkProps> = (props) => {
  const {
    regionId,
    bucketName,
    fileItem,
    defaultDomain,
    ...modalProps
  } = props;

  const {translate} = useI18n();
  const {currentUser} = useAuth();

  // cache operation states prevent props update after modal opened.
  const {
    memoFileItem,
    memoRegionId,
    memoBucketName,
    memoDefaultDomain,
  } = useMemo(() => ({
    memoFileItem: fileItem,
    memoRegionId: regionId,
    memoBucketName: bucketName,
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
  });

  // state when generate succeed
  const [fileLink, setFileLink] = useState<string>();

  // form for generating file link
  const generateLinkFormController = useForm<GenerateLinkFormData>({
    mode: "onChange",
    defaultValues: {
      domainName: memoDefaultDomain?.name ?? NON_OWNED_DOMAIN,
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
      preferS3Adapter: !data.domain,
    };

    return signatureUrl(
      memoRegionId,
      memoBucketName,
      memoFileItem.path.toString(),
      data.domain,
      data.expireAfter,
      opt,
    )
      .then(fileUrl => {
        setFileLink(fileUrl.toString());
      });

    // return toast.promise(p, {
    //   loading: translate("common.submitting"),
    //   success: translate("common.submitted"),
    //   error: translate("common.failed"),
    // });
  };

  const {ref: submitButtonRef, portal: submitButtonPortal} = usePortal();

  // reset states when open/close modal
  useEffect(() => {
    if (modalProps.show) {
      reset({
        domainName: memoDefaultDomain?.name ?? NON_OWNED_DOMAIN,
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
              {translate("common.noOperationalObject")}
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
