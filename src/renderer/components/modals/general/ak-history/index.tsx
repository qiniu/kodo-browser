import React from "react";
import {Button, Modal, ModalProps, Table} from "react-bootstrap";

import {useI18n} from "@renderer/modules/i18n";
import {AkItem, useAuth} from "@renderer/modules/auth";

import EmptyHolder from "@renderer/components/empty-holder";

import AkTableRow from "./ak-table-row";

interface AkHistoryProps {
  onActiveAk: (akItem: AkItem) => void,
}

const AkHistory: React.FC<ModalProps & AkHistoryProps> = (props) => {
  const {translate} = useI18n();
  const {akHistory, deleteHistory, clearHistory} = useAuth();

  const {
    onActiveAk,
    ...modalProps
  } = props;

  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-clock-history me-1"/>
          {translate("modals.akHistory.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Button
          className="mb-1"
          variant="danger"
          size="sm"
          onClick={clearHistory}
        >
          {translate("modals.akHistory.removeAllButton")}
        </Button>
        <div className="scroll-max-vh-60 scroll-shadow position-relative">
          <Table striped hover>
            <thead className="sticky-top bg-body">
            <tr>
              <th>{translate("modals.akHistory.table.endpoint")}</th>
              <th>{translate("modals.akHistory.table.accessKeyId")}</th>
              <th>{translate("modals.akHistory.table.accessKeySecret")}</th>
              <th>{translate("modals.akHistory.table.description")}</th>
              <th>{translate("modals.akHistory.table.operation")}</th>
            </tr>
            </thead>
            <tbody>
            {
              akHistory.length
                ? akHistory.map(item => (
                  <AkTableRow
                    key={item.accessKey + item.accessSecret}
                    data={item}
                    onActive={onActiveAk}
                    onDelete={deleteHistory}
                  />
                ))
                : <EmptyHolder col={5}/>
            }
            </tbody>
          </Table>
        </div>
      </Modal.Body>
    </Modal>
  )
};

export default AkHistory;
