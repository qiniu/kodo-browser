import React from "react";
import {Button} from "react-bootstrap";
import moment from "moment";

import {useI18n} from "@renderer/modules/i18n";
import {BookmarkItem} from "@renderer/modules/user-config-store";

interface BookmarkTableRowProps {
  data: BookmarkItem,
  onActive?: (item: BookmarkItem) => void,
  onDelete?: (item: BookmarkItem) => void,
}

const BookmarkTableRow: React.FC<BookmarkTableRowProps> = ({
  data,
  onActive,
  onDelete,
}) => {
  const {translate} = useI18n();

  return (
    <tr>
      <td className="align-middle">
        <span
          className="text-link"
          onClick={() => onActive?.(data)}
        >
          {data.protocol}{data.path}
        </span>
      </td>
      <td className="align-middle">
        {moment(data.timestamp).format("YYYY-MM-DD HH:mm:ss")}
      </td>
      <td className="align-middle text-nowrap">
        {
          onDelete
            ? <Button
              variant="lite-danger"
              size="sm"
              onClick={() => onDelete(data)}
            >
              {translate("modals.bookmarkManager.removeBookmarkButton")}
            </Button>
            : null
        }
      </td>
    </tr>
  )
}

export default BookmarkTableRow;
