import React, {useEffect, useState} from "react";
import {Image} from "react-bootstrap";
import {toast} from "react-hot-toast";

import Duration, {convertDuration} from "@common/const/duration";
import {BackendMode} from "@common/qiniu"

import {getStyleForSignature, signatureUrl} from "@renderer/modules/qiniu-client";
import {useI18n} from "@renderer/modules/i18n";
import {useAuth} from "@renderer/modules/auth";
import {DomainAdapter, NON_OWNED_DOMAIN} from "@renderer/modules/qiniu-client-hooks";

import LoadingHolder from "@renderer/components/loading-holder";

interface PictureContentProps {
  regionId: string,
  bucketName: string,
  filePath: string,
  domain: DomainAdapter,
}

const PictureContent: React.FC<PictureContentProps> = ({
  regionId,
  bucketName,
  filePath,
  domain,
}) => {
  const {translate} = useI18n();
  const {currentUser} = useAuth();

  const [imgSrc, setImgSrc] = useState<string>();
  const [imgLoading, setImgLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!currentUser || !filePath) {
      return;
    }

    const opt = {
      id: currentUser.accessKey,
      secret: currentUser.accessSecret,
      endpointType: currentUser.endpointType,
      preferS3Adapter: domain.apiScope === BackendMode.S3,
    };

    const apiDomain = domain.name === NON_OWNED_DOMAIN.name
      ? undefined
      : domain;

    const style = getStyleForSignature({
      domain: apiDomain,
      preferBackendMode: domain.apiScope === BackendMode.S3 ? BackendMode.S3 : BackendMode.Kodo,
      currentEndpointType: currentUser.endpointType,
    });

    signatureUrl(
      regionId,
      bucketName,
      filePath,
      apiDomain,
      convertDuration(12 * Duration.Hour, Duration.Second),
      style,
      opt,
    )
      .then(fileUrl => {
        setImgSrc(fileUrl.toString());
      })
      .catch(() => {
        toast.error(translate("modals.preview.error.failedGenerateLink"));
        setImgLoading(false);
      });
    return () => {
      setImgSrc(undefined);
      setImgLoading(true);
    };
  }, [filePath]);

  return (
    <div className="h-60v d-flex flex-column align-items-center position-relative">
      <Image
        className="box-fit-contain"
        src={imgSrc}
        onLoad={() => setImgLoading(false)}
      />
      {
        imgLoading
          ? <LoadingHolder className="position-absolute"/>
          : null
      }
    </div>
  )
};

export default PictureContent;
