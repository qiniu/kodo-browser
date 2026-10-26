import React, {Fragment} from "react";
import {Form} from "react-bootstrap";
import {QRCodeSVG} from 'qrcode.react';
import {useI18n} from "@renderer/modules/i18n";

interface FileNameFieldProps {
  fileLink: string,
}


const FileQRCodeField: React.FC<FileNameFieldProps> = ({
  fileLink,
}) => {
  const {translate} = useI18n();

  return (
    <Form.Group as={Fragment} controlId="fileName">
      <Form.Label className="text-end">
        {translate("forms.generateLink.fileQRCode.label")}
      </Form.Label>
      <div>
        <QRCodeSVG
          value={fileLink}
          size={128}
        />
      </div>
    </Form.Group>
  );
};

export default FileQRCodeField;
