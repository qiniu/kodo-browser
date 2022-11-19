import React, {PropsWithChildren, useEffect, useRef, useState} from "react";
import {toast} from "react-hot-toast";
import {Button, Spinner} from "react-bootstrap";
import {Editor} from "codemirror";
import {MergeView} from "codemirror/addon/merge/merge";
import {BackendMode} from "@common/qiniu"

import {useI18n} from "@renderer/modules/i18n";
import {EndpointType, useAuth} from "@renderer/modules/auth";
import {getContent, saveContent} from "@renderer/modules/qiniu-client";
import {DomainAdapter, NON_OWNED_DOMAIN} from "@renderer/modules/qiniu-client-hooks";
import {DiffView, EditorView} from "@renderer/modules/codemirror";

import LoadingHolder from "@renderer/components/loading-holder";

interface CodeContentProps {
  regionId: string,
  bucketName: string,
  filePath: string,
  domain: DomainAdapter,
  readOnly?: boolean,
  portal?: React.FC<PropsWithChildren>,
}

const CodeContent: React.FC<CodeContentProps> = ({
  regionId,
  bucketName,
  filePath,
  domain,
  readOnly,
  portal: Portal,
}) => {
  const {translate} = useI18n();
  const {currentUser} = useAuth();

  // code mirror editor
  const editorRef = useRef<Editor>();
  const diffEditorRef = useRef<MergeView>();
  const [isShowDiff, setIsShowDiff] = useState<boolean>(false);
  const [dirtyContent, setDirtyContent] = useState<string>("");

  useEffect(() => {
    setIsShowDiff(false);
    setDirtyContent("");
  }, [filePath]);

  const showDiffView = (originalContent: string) => {
    const content = editorRef.current?.getValue();
    // "" is legal, don't use `!content`
    if (content === undefined) {
      return;
    }
    if (content === originalContent) {
      toast(translate("modals.preview.error.contentNotChanged"))
      return;
    }
    setDirtyContent(content);
    setIsShowDiff(true);
  };
  // ---

  // fetch content
  const [codeContent, setCodeContent] = useState<string>("");
  const [contentLoading, setContentLoading] = useState<boolean>(true);

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
    getContent(
      regionId,
      bucketName,
      filePath,
      domain.name === NON_OWNED_DOMAIN.name
        ? undefined
        : domain,
      opt,
    )
      .then(contentBuffer => {
        setCodeContent(contentBuffer.toString());
      })
      .catch(() => {
        toast.error(translate("modals.preview.error.failedGetContent"));
      })
      .finally(() => {
        setContentLoading(false);
      });
    return () => {
      setContentLoading(true);
    };
  }, [filePath]);
  // ---

  // save content
  const [isSavingContent, setIsSavingContent] = useState<boolean>(false);
  const handleSaveContent = () => {
    if (!currentUser || !filePath) {
      return;
    }

    setIsSavingContent(true);

    const opt = {
      id: currentUser.accessKey,
      secret: currentUser.accessSecret,
      isPublicCloud: currentUser.endpointType === EndpointType.Public,
      preferS3Adapter: domain.backendMode === BackendMode.S3,
      preferKodoAdapter: domain.backendMode === BackendMode.Kodo,
    };

    const p = saveContent(
      regionId,
      bucketName,
      filePath,
      Buffer.from(dirtyContent),
      domain.name === NON_OWNED_DOMAIN.name
        ? undefined
        : domain,
      opt,
    );

    p
      .then(() => {
        setCodeContent(dirtyContent);
        setIsShowDiff(false);
      })
      .finally(() => {
        setIsSavingContent(false);
      });

    return toast.promise(p, {
      loading: translate("common.submitting"),
      success: translate("common.submitted"),
      error: err => `${translate("common.failed")}: ${err}`,
    });
  };
  // ---

  return (
    <>
      <div className="h-60v d-flex justify-content-center">
        {
          contentLoading
            ? <LoadingHolder/>
            : !isShowDiff
              ? <EditorView
                defaultValue={codeContent}
                readOnly={readOnly}
                editorRef={editorRef}
              />
              : <DiffView
                originalValue={codeContent}
                dirtiedValue={dirtyContent}
                editorRef={diffEditorRef}
              />
        }
      </div>
      {
        Portal &&
        <Portal>
          {
            !isShowDiff
              ? <Button
                size="sm"
                variant="primary"
                onClick={() => showDiffView(codeContent)}
              >
                <i className="fa fa-floppy-o me-1"/>
                {translate("modals.preview.content.code.showDiffView")}
              </Button>
              : <Button
                size="sm"
                variant="primary"
                onClick={handleSaveContent}
                disabled={isSavingContent}
              >
                {
                  isSavingContent
                    ? <>
                      <Spinner className="me-1" animation="border" size="sm"/>
                      {translate("common.saving")}
                    </>
                    : <>
                      <i className="bi bi-cloud-upload me-1"/>
                      {translate("modals.preview.content.code.saveContent")}
                    </>
                }
              </Button>
          }
        </Portal>
      }
    </>
  )
};

export default CodeContent;
