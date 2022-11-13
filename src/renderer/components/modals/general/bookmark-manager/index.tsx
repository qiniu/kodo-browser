import React from "react";
import {Modal, ModalProps, Table} from "react-bootstrap";

import {useI18n} from "@renderer/modules/i18n";
import {useAuth} from "@renderer/modules/auth";
import {BookmarkItem, useKodoBookmark} from "@renderer/modules/kodo-address";

import EmptyHolder from "@renderer/components/empty-holder";

import BookmarkTableRow from "./bookmark-table-row";

interface BookmarkManagerProps {
  onActiveBookmark: (bookmark: BookmarkItem) => void,
}

const BookmarkManager: React.FC<ModalProps & BookmarkManagerProps> = ({
  onActiveBookmark,
  ...modalProps
}) => {
  const {translate} = useI18n();
  const {currentUser} = useAuth();

  const {
    bookmarkState: {
      list: bookmarks,
    },
    deleteBookmark,
  } = useKodoBookmark(currentUser);

  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-star-fill text-yellow me-1"/>
          {translate("modals.bookmarkManager.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="scroll-max-vh-60 scroll-shadow position-relative">
          <Table bordered striped hover size="sm">
            <thead className="sticky-top bg-body">
            <tr>
              <th>{translate("modals.bookmarkManager.table.url")}</th>
              <th>{translate("modals.bookmarkManager.table.createTime")}</th>
              <th>{translate("modals.bookmarkManager.table.operation")}</th>
            </tr>
            </thead>
            <tbody>
            {
              bookmarks.length
                ? bookmarks.map(item => (
                  <BookmarkTableRow
                    key={item.protocol + item.path}
                    data={item}
                    onActive={bookmark => {
                      onActiveBookmark(bookmark);
                      modalProps.onHide?.();
                    }}
                    onDelete={itemToDelete => {
                      deleteBookmark(itemToDelete);
                    }}
                  />
                ))
                : <EmptyHolder col={3}/>
            }
            </tbody>
          </Table>
        </div>
      </Modal.Body>
    </Modal>
  )
};

export default BookmarkManager;
