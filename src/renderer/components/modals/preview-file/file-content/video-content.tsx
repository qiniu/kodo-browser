import React, {useEffect, useState} from "react";
import {toast} from "react-hot-toast";
import {Domain} from "kodo-s3-adapter-sdk/dist/adapter";

import Duration, {convertDuration} from "@common/const/duration";
import {signatureUrl} from "@renderer/modules/qiniu-client";
import {useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";

import LoadingHolder from "@renderer/components/loading-holder";

interface VideoContentProps {
  regionId: string,
  bucketName: string,
  filePath: string,
  fileExt: string,
  domain?: Domain,
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
