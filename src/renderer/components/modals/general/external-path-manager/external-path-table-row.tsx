import React from "react";
import {Button} from "react-bootstrap";
import {Region} from "kodo-s3-adapter-sdk";

import {useI18n} from "@renderer/modules/i18n";
import {ExternalPathItem} from "@renderer/modules/kodo-address";

interface ExternalPathTableRowProps {
  regions: Region[],
  data: ExternalPathItem,
  onActive?: (item: ExternalPathItem) => void,
  onDelete?: (item: ExternalPathItem) => void,
}

const ExternalPathTableRow: React.FC<ExternalPathTableRowProps> = ({
  regions,
  data,
  onActive,
  onDelete,
}) => {
  const {currentLanguage, translate} = useI18n();

  const region = regions.find(r => r.s3Id === data.regionId);

  return (
    <tr>
      <td className="align-middle">
        <span
          className="text-link"
          onClick={() => onActive?.(data)}
        >
          <i className="bi bi-signpost-2-fill text-brown me-1"/>
          {data.protocol}{data.path}
        </span>
      </td>
      <td className="align-middle">
        {
          region?.translatedLabels?.[currentLanguage]
          ?? region?.label
          ?? data.regionId
        }
      </td>
      <td className="align-middle">
        {
          onDelete
            ? <Button
              variant="lite-danger"
              size="sm"
              onClick={() => onDelete(data)}
            >
              {translate("modals.externalPathManager.removeButton")}
            </Button>
            : null
        }
      </td>
    </tr>
  );
};

export default ExternalPathTableRow;
