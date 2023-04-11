import React, {PropsWithChildren, useState} from "react";
import {SubmitHandler, useForm} from "react-hook-form";

import {BackendMode} from "@common/qiniu"

import {EndpointType, useAuth} from "@renderer/modules/auth";
import {FileItem, signatureUrl} from "@renderer/modules/qiniu-client";
import {DomainAdapter, NON_OWNED_DOMAIN, useLoadDomains} from "@renderer/modules/qiniu-client-hooks";
import {useFileOperation} from "@renderer/modules/file-operation";

import {
  GenerateLinkForm,
  GenerateLinkFormData,
  GenerateLinkSubmitData,
} from "@renderer/components/forms";

interface GenerateLinkProps {
  regionId: string,
  bucketName: string,
  fileItem: FileItem.File,
  canS3Domain: boolean,
  defaultDomain?: DomainAdapter,
  submitButtonPortal?: React.FC<PropsWithChildren>,
}

const GenerateLink: React.FC<GenerateLinkProps> =({
  regionId,
  bucketName,
  fileItem,
  canS3Domain,
  defaultDomain,
  submitButtonPortal,
}) => {
  const {currentUser} = useAuth();
  const {bucketPreferBackendMode: preferBackendMode} = useFileOperation();

  // domains loader
  const {
    loadDomainsState: {
      loading: loadingDomains,
      domains,
    },
    loadDomains,
  } = useLoadDomains({
    user: currentUser,
    regionId,
    bucketName,
    canS3Domain,
    preferBackendMode,
  });

  // form for generating file link
  const generateLinkFormController = useForm<GenerateLinkFormData>({
    mode: "onChange",
    defaultValues: {
      domainName: defaultDomain?.name ?? NON_OWNED_DOMAIN.name,
      expireAfter: 600,
    },
  });

  // state when generate succeed
  const [fileLink, setFileLink] = useState<string>();

  const handleSubmitGenerateFileLink: SubmitHandler<GenerateLinkSubmitData> = (data) => {
    if (!fileItem || !currentUser) {
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
      regionId,
      bucketName,
      fileItem.path.toString(),
      domain,
      data.expireAfter,
      opt,
    )
      .then(fileUrl => {
        setFileLink(fileUrl.toString());
      });
  };

  return (
    <div className="p-4">
      <GenerateLinkForm
        filePath={fileItem.path.toString()}
        fileLink={fileLink}
        formController={generateLinkFormController}
        loadingDomains={loadingDomains}
        domains={domains}
        defaultDomain={defaultDomain}
        onReloadDomains={loadDomains}
        onSubmit={handleSubmitGenerateFileLink}
        submitButtonPortal={submitButtonPortal}
      />
    </div>
  );
};

export default GenerateLink;
