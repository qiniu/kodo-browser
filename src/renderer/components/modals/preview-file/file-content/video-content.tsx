import React, {useEffect, useState} from "react";
import {toast} from "react-hot-toast";

import Duration, {convertDuration} from "@common/const/duration";
import {BackendMode} from "@common/qiniu"

import {getStyleForSignature, signatureUrl} from "@renderer/modules/qiniu-client";
import {useI18n} from "@renderer/modules/i18n";
import {useAuth} from "@renderer/modules/auth";
import {DomainAdapter, NON_OWNED_DOMAIN} from "@renderer/modules/qiniu-client-hooks";

import LoadingHolder from "@renderer/components/loading-holder";

interface VideoContentProps {
  regionId: string,
  bucketName: string,
  filePath: string,
  fileExt: string,
  domain: DomainAdapter,
  autoplay?: boolean,
}

const VideoContent: React.FC<VideoContentProps> = ({
  regionId,
  bucketName,
  filePath,
  fileExt,
  domain,
  autoplay = false,
}) => {
  const {translate} = useI18n();
  const {currentUser} = useAuth();

  const [videoSrc, setVideoSrc] = useState<string>();

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
        setVideoSrc(fileUrl.toString());
      })
      .catch(() => {
        toast.error(translate("modals.preview.error.failedGenerateLink"));
      });
    return () => {
      setVideoSrc(undefined);
    };
  }, [filePath]);

  const renderPlayer = () => {
    if (!videoSrc) {
      return (
        <LoadingHolder/>
      );
    }

    if (fileExt === "flv") {
      const params = {
        src: encodeURIComponent(videoSrc),
        autoplay: autoplay ? "autoplay" : "",
      };
      const paramsStr = Object.entries(params)
        .map(kv => kv.join("="))
        .join("&");
      return (
        <iframe
          className="w-100 h-100"
          scrolling="no"
          src={`./static/flv-player.html?${paramsStr}`}
        />
      );
    }

    return (
      <video className="box-fit-contain" src={videoSrc} controls autoPlay={autoplay}/>
    );
  }

  return (
    <div className="h-60v d-flex justify-content-center align-items-center">
      {renderPlayer()}
    </div>
  )
};

export default VideoContent;
