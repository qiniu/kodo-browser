import React, {useEffect, useState} from "react";
import {toast} from "react-hot-toast";
import {Domain} from "kodo-s3-adapter-sdk/dist/adapter";

import Duration, {convertDuration} from "@common/const/duration";
import {useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {signatureUrl} from "@renderer/modules/qiniu-client";
import LoadingHolder from "@renderer/components/loading-holder";

interface AudioContentProps {
  regionId: string,
  bucketName: string,
  filePath: string,
  domain?: Domain,
}

const AudioContent: React.FC<AudioContentProps> = ({
  regionId,
  bucketName,
  filePath,
  domain,
}) => {
  const {translate} = useI18n();
  const {currentUser} = useAuth();

  const [audioSrc, setAudioSrc] = useState<string>();

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
        setAudioSrc(fileUrl.toString());
      })
      .catch(() => {
        toast.error(translate("modals.preview.error.failedGenerateLink"));
      });
    return () => {
      setAudioSrc(undefined);
    };
  }, [filePath]);

  return (
    <div className="mxh-50v d-flex justify-content-center align-items-center">
      {
        !audioSrc
          ? <LoadingHolder/>
          : <audio src={audioSrc} controls preload="none"/>
      }
    </div>
  )
};

export default AudioContent;
