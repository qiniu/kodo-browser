import {clipboard} from "electron";

import React, {Fragment} from "react";
import {Button, Form, InputGroup} from "react-bootstrap";
import {toast} from "react-hot-toast";

import {useI18n} from "@renderer/modules/i18n";

interface FileLinkFieldProps {
  fileLink: string,
  loading: boolean,
}

const FileLinkField: React.FC<FileLinkFieldProps> = ({
  fileLink,
  loading,
}) => {
  const {translate} = useI18n();

  const handleCopyFileLink = () => {
    clipboard.writeText(fileLink);
    toast.success(translate("forms.generateLink.fileLink.copied"));
  }

  return (
    <Form.Group
      as={Fragment}
      controlId="fileLink"
    >
      <Form.Label className="text-end">
        {translate("forms.generateLink.fileLink.label")}
      </Form.Label>
      <InputGroup>
        <Form.Control
          type="text"
          value={fileLink || ""}
          readOnly
        />
        <Button
          disabled={loading}
          variant="info"
          onClick={handleCopyFileLink}
        >
          {
            loading
              ? <i className="spinner-border spinner-border-sm text-light"/>
              : <i className="fa fa-clone text-white"/>
          }
        </Button>
      </InputGroup>
    </Form.Group>
  );
};

export default FileLinkField;
