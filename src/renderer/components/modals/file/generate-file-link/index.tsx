import React, {useCallback, useEffect, useMemo, useState} from "react";
import {Button, Modal, ModalProps} from "react-bootstrap";
import {SubmitHandler, useForm} from "react-hook-form";
import lodash from "lodash";

import {BackendMode} from "@common/qiniu"

import {useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {FileItem, signatureUrl} from "@renderer/modules/qiniu-client";
import {DomainAdapter, NON_OWNED_DOMAIN, useLoadDomains} from "@renderer/modules/qiniu-client-hooks";
import {useFileOperation} from "@renderer/modules/file-operation";

import {
  DEFAULT_EXPIRE_AFTER,
  GenerateLinkFormData,
  GenerateLinkForm,
  DomainNameField,
  ExpireAfterField,
  FileLinkField,
  FileNameField,
} from "@renderer/components/forms/generate-link-form";

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
    canDefaultS3Domain: memoCanS3Domain,
    preferBackendMode,
  });

  // state when generate succeed
  const [fileLink, setFileLink] = useState<string>('');

  // form for generating file link
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: {
      isSubmitting,
    },
  } = useForm<GenerateLinkFormData>({
    mode: "onChange",
  });

  // generate file link result
  const handleSubmitGenerateFileLink: SubmitHandler<GenerateLinkFormData> = useCallback(data => {
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
        data.domain?.apiScope === BackendMode.S3,
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
  }, [currentUser, memoFileItem, memoRegionId, memoBucketName, setFileLink]);
  const generateFileLinkDebounced = useCallback(lodash.debounce(() => {
    handleSubmit(handleSubmitGenerateFileLink)();
  }, 500), [handleSubmit, handleSubmitGenerateFileLink]);

  // reset states when open/close modal
  useEffect(() => {
    if (modalProps.show) {
      reset({
        domain: memoDefaultDomain ?? NON_OWNED_DOMAIN,
        expireAfter: DEFAULT_EXPIRE_AFTER,
      });
    } else {
      setFileLink('');
    }
  }, [modalProps.show]);

  // watch form values
  const [domain, expireAfter] = watch(["domain", "expireAfter"]);
  useEffect(() => {
    generateFileLinkDebounced();
  }, [domain, expireAfter]);

  // render
  const renderModalBody = () => {
    if (!memoFileItem) {
      return (
        <div>{translate("common.noObjectSelected")}</div>
      )
    }
    return (
      <GenerateLinkForm>
        <FileNameField
          fileName={memoFileItem.name}
        />
        <DomainNameField
          control={control}
          isEmptyPath={!Boolean(memoFileItem.path.toString())}
          defaultDomain={memoDefaultDomain}
          domains={domains}
          loadingDomains={loadingDomains}
          onReloadDomains={loadDomains}
        />
        {
          (domain?.private || domain?.protected) &&
          <ExpireAfterField
            control={control}
            maxValue={domain.linkMaxLifetime}
          />
        }
        <FileLinkField
          fileLink={fileLink}
          loading={isSubmitting}
        />
      </GenerateLinkForm>
    );
  };

  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-link-45deg me-1"/>
          {translate("modals.generateFileLink.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {renderModalBody()}
      </Modal.Body>
      <Modal.Footer>
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
