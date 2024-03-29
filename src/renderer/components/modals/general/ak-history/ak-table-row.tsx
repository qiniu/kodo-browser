import React from "react";
import {Button} from "react-bootstrap";

import {useI18n} from "@renderer/modules/i18n";

import {AkItem} from "@renderer/modules/auth";

interface AkTableRowProps {
  data: AkItem,
  isCurrentUser?: boolean,
  onActive?: (item: AkItem) => void,
  onDelete?: (item: AkItem) => void,
}

const AkTableRow: React.FC<AkTableRowProps> = ({
  data,
  isCurrentUser,
  onActive,
  onDelete,
}) => {
  const {translate} = useI18n();

  return (
    <tr>
      <td className="align-middle fs-075em">{data.endpointType}</td>
      <td className="align-middle fs-075em text-break">{data.accessKey}</td>
      <td className="align-middle fs-075em text-break">{data.accessSecret}</td>
      <td className="align-middle fs-075em">{data.description}</td>
      <td className="align-middle text-nowrap">
        {
          !onActive
            ? null
            : isCurrentUser
              ? <small>{translate("modals.akHistory.currentUser")}</small>
              : <Button variant="lite-primary" size="sm" onClick={() => onActive(data)}>
                {translate("modals.akHistory.useAkButton")}
              </Button>
        }
        {
          !onDelete
            ? null
            : <Button variant="lite-danger" size="sm" onClick={() => onDelete(data)}>
              {translate("modals.akHistory.removeAkButton")}
            </Button>
        }
      </td>
    </tr>
  )
}

export default AkTableRow;
