import React from "react";
import {Button} from "react-bootstrap";

import {useI18n} from "@renderer/modules/i18n";

import {AkItem} from "@renderer/modules/auth";

interface AkItemProps {
  data: AkItem,
  onActive?: (item: AkItem) => void,
  onDelete?: (item: AkItem) => void,
}

const AkTableRow: React.FC<AkItemProps> = (props) => {
  const {translate} = useI18n();

  const {
    data,
    onActive,
    onDelete,
  } = props;

  return (
    <tr>
      <td className="align-middle fs-075em">{data.endpointType}</td>
      <td className="align-middle fs-075em text-break">{data.accessKey}</td>
      <td className="align-middle fs-075em text-break">{data.accessSecret}</td>
      <td className="align-middle fs-075em">{data.description}</td>
      <td className="align-middle text-nowrap">
        {
          onActive
            ? <Button variant="lite-primary" size="sm" onClick={() => onActive(data)}>
              {translate("modals.akHistory.activeAkButton")}
            </Button>
            : null
        }
        {
          onDelete
            ? <Button variant="lite-danger" size="sm" onClick={() => onDelete(data)}>
              {translate("modals.akHistory.removeAkButton")}
            </Button>
            : null
        }
      </td>
    </tr>
  )
}

export default AkTableRow;
