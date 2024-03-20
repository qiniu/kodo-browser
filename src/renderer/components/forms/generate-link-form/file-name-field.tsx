import React, {Fragment} from "react";
import {Form} from "react-bootstrap";

import {useI18n} from "@renderer/modules/i18n";

interface FileNameFieldProps {
  fileName: string,
}

const FileNameField: React.FC<FileNameFieldProps> = ({
  fileName,
}) => {
  const {translate} = useI18n();

  return (
    <Form.Group as={Fragment} controlId="fileName">
      <Form.Label className="text-end">
        {translate("forms.generateLink.fileName.label")}
      </Form.Label>
      <div>
        <Form.Control
          plaintext
          readOnly
          defaultValue={fileName}
        />
      </div>
    </Form.Group>
  );
};

export default FileNameField;
