import React, {useEffect, useState} from "react";
import {Modal, ModalProps} from "react-bootstrap";

import {app} from "@common/const/app-config";
import {useI18n} from "@renderer/modules/i18n";
import {fetchReleaseNote} from "@renderer/modules/update-app";
import MarkdownView from "@renderer/modules/markdown";

import LoadingHolder from "@renderer/components/loading-holder";

interface ReleaseNoteModalProps {
  version?: string,
}

const ReleaseNoteModal: React.FC<ModalProps & ReleaseNoteModalProps> = ({
  version = app.version,
  ...modalProps
}) => {
  const {translate} = useI18n();

  const [loading, setLoading] = useState<boolean>(true);
  const [releaseNote, setReleaseNote] = useState<string>();

  useEffect(() => {
    if (modalProps.show) {
      setLoading(true);
      fetchReleaseNote(version)
        .then(releaseText => {
          setReleaseNote(releaseText);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [modalProps.show])

  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-tag-fill me-1"/>
          v{version} {translate("modals.releaseNote.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="text-bg-info bg-opacity-10 p-2 scroll-max-vh-40">
          {
            loading
              ? <LoadingHolder/>
              : <MarkdownView
                text={releaseNote}
              />
          }
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default ReleaseNoteModal;
