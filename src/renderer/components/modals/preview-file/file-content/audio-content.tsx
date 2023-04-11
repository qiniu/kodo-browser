import React, {useEffect, useState} from "react";
import {toast} from "react-hot-toast";

import Duration, {convertDuration} from "@common/const/duration";
import {BackendMode} from "@common/qiniu"

import {useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {signatureUrl} from "@renderer/modules/qiniu-client";
import {DomainAdapter, NON_OWNED_DOMAIN} from "@renderer/modules/qiniu-client-hooks";

import LoadingHolder from "@renderer/components/loading-holder";

interface AudioContentProps {
  regionId: string,
  bucketName: string,
  filePath: string,
  domain: DomainAdapter,
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
      preferS3Adapter: domain.backendMode === BackendMode.S3,
    };
    signatureUrl(
      regionId,
      bucketName,
      filePath,
      domain.name === NON_OWNED_DOMAIN.name
        ? undefined
        : domain,
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
