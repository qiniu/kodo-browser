import React, {useCallback, useEffect, useState} from "react";
import {SubmitHandler, useForm} from "react-hook-form";
import lodash from "lodash";

import {BackendMode} from "@common/qiniu"

import {useAuth} from "@renderer/modules/auth";
import {FileItem, signatureUrl} from "@renderer/modules/qiniu-client";
import {DomainAdapter, NON_OWNED_DOMAIN, useLoadDomains} from "@renderer/modules/qiniu-client-hooks";
import {useFileOperation} from "@renderer/modules/file-operation";

import {
  DomainNameField,
  ExpireAfterField,
  FileLinkField,
  GenerateLinkForm,
  GenerateLinkFormData,
} from "@renderer/components/forms/generate-link-form";

interface GenerateLinkProps {
  regionId: string,
  bucketName: string,
  fileItem: FileItem.File,
  canS3Domain: boolean,
  defaultDomain?: DomainAdapter,
}

const GenerateLink: React.FC<GenerateLinkProps> =({
  regionId,
  bucketName,
  fileItem,
  canS3Domain,
  defaultDomain,
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
    canDefaultS3Domain: canS3Domain,
    preferBackendMode,
  });

  // form for generating file link
  const {
    control,
    handleSubmit,
    watch,
    formState: {
      isSubmitting,
    },
  } = useForm<GenerateLinkFormData>({
    mode: "onChange",
    defaultValues: {
      domain: defaultDomain ?? NON_OWNED_DOMAIN,
      expireAfter: 600,
    },
  });

  // state when generate succeed
  const [fileLink, setFileLink] = useState("");

  const handleSubmitGenerateFileLink: SubmitHandler<GenerateLinkFormData> = useCallback(data => {
    if (!fileItem || !currentUser) {
      return;
    }

    const opt = {
      id: currentUser.accessKey,
      secret: currentUser.accessSecret,
      endpointType: currentUser.endpointType,
      preferKodoAdapter: preferBackendMode === BackendMode.Kodo,
      preferS3Adapter:
        preferBackendMode === BackendMode.S3 ||
        data.domain?.apiScope === BackendMode.S3,
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
  }, [currentUser, regionId, bucketName, fileItem, setFileLink]);
  const generateFileLinkDebounced = useCallback(lodash.debounce(() => {
    handleSubmit(handleSubmitGenerateFileLink)();
  }, 500), [handleSubmit, handleSubmitGenerateFileLink]);

  // watch form values
  const [domain, expireAfter] = watch(["domain", "expireAfter"]);
  useEffect(() => {
    generateFileLinkDebounced();
  }, [domain, expireAfter]);

  // render
  return (
    <div className="p-4">
      <GenerateLinkForm>
        <DomainNameField
          control={control}
          isEmptyPath={!Boolean(fileItem.path.toString())}
          defaultDomain={defaultDomain}
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
    </div>
  );
};

export default GenerateLink;
