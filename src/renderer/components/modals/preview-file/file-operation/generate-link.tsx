import React, {PropsWithChildren, useState} from "react";
import {Domain} from "kodo-s3-adapter-sdk/dist/adapter";
import {FileItem, signatureUrl} from "@renderer/modules/qiniu-client";
import {SubmitHandler, useForm} from "react-hook-form";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {useLoadDomains} from "@renderer/modules/qiniu-client-hooks";

import {
  GenerateLinkForm,
  GenerateLinkFormData,
  GenerateLinkSubmitData,
  NON_OWNED_DOMAIN
} from "@renderer/components/forms";

interface GenerateLinkProps {
  regionId: string,
  bucketName: string,
  fileItem: FileItem.File,
  defaultDomain?: Domain,
  submitButtonPortal?: React.FC<PropsWithChildren>,
}

const GenerateLink: React.FC<GenerateLinkProps> =({
  regionId,
  bucketName,
  fileItem,
  defaultDomain,
  submitButtonPortal,
}) => {
  const {currentUser} = useAuth();

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
  });

  // form for generating file link
  const generateLinkFormController = useForm<GenerateLinkFormData>({
    mode: "onChange",
    defaultValues: {
      domainName: defaultDomain?.name ?? NON_OWNED_DOMAIN,
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
      preferS3Adapter: !data.domain,
    };

    return signatureUrl(
      regionId,
      bucketName,
      fileItem.path.toString(),
      data.domain,
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
