import React, {useEffect, useState} from "react";
import {Image} from "react-bootstrap";
import {toast} from "react-hot-toast";
import {Domain} from "kodo-s3-adapter-sdk/dist/adapter";

import Duration, {convertDuration} from "@common/const/duration";
import {signatureUrl} from "@renderer/modules/qiniu-client";
import {useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";

import LoadingHolder from "@renderer/components/loading-holder";

interface PictureContentProps {
  regionId: string,
  bucketName: string,
  filePath: string,
  domain?: Domain,
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
      isPublicCloud: currentUser.endpointType === EndpointType.Public,
      preferS3Adapter: !domain,
    };
    signatureUrl(
      regionId,
      bucketName,
      filePath,
      domain,
      convertDuration(12 * Duration.Hour, Duration.Second),
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
    <div className="h-60v d-flex flex-column align-items-center">
      <Image
        className="box-fit-contain"
        src={imgSrc}
        onLoad={() => setImgLoading(false)}
      />
      {
        imgLoading
          ? <LoadingHolder/>
          : null
      }
    </div>
  )
};

export default PictureContent;
