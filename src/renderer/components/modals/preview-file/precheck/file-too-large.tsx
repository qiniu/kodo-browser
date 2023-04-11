import React, {PropsWithChildren, useEffect, useState} from "react";
import {Button} from "react-bootstrap";

import ByteSize, {byteSizeFormat} from "@common/const/byte-size";
import {Translate, useI18n} from "@renderer/modules/i18n";

interface FileTooLargeProps {
  fileSize: number,
  canForcePreview?: boolean, // default true
  maxPreviewSize?: number, // Bytes, default 5MB
}

const MAX_PREVIEW_SIZE = 5 * ByteSize.MB;

const FileTooLarge: React.FC<PropsWithChildren<FileTooLargeProps>> = ({
  children,
  fileSize,
  canForcePreview = true,
  maxPreviewSize = MAX_PREVIEW_SIZE,
}) => {
  const {translate} = useI18n();

  const [isShowContent, setIsShowContent] = useState(fileSize <= maxPreviewSize);

  useEffect(() => {
    setIsShowContent(fileSize <= maxPreviewSize);
  }, [fileSize, maxPreviewSize]);

  const i18nContent = {
    maxPreviewSize: byteSizeFormat(maxPreviewSize),
  };

  return (
    <>
      {
        !isShowContent
          ? <div className="text-center text-bg-warning bg-opacity-10 p-4">
            {
              !canForcePreview
                ? <Translate
                  i18nKey="modals.preview.preCheck.tooLarge.noPreview"
                  data={i18nContent}
                  slots={{
                    maxPreviewSize: v => <b>{v}</b>,
                  }}
                />
                : <>
                  <Translate
                    i18nKey="modals.preview.preCheck.tooLarge.previewWarning"
                    data={i18nContent}
                    slots={{
                      maxPreviewSize: v => <b>{v}</b>,
                    }}
                  />
                  <Button
                    variant="lite-primary"
                    onClick={() => setIsShowContent(true)}
                  >
                    {translate("modals.preview.preCheck.tooLarge.forcePreview")}
                  </Button>
                </>
            }
          </div>
          : children
      }
    </>
  );
};

export default FileTooLarge;
