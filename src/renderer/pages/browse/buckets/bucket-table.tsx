import React from "react";
import {Form, Table} from "react-bootstrap";

import {useI18n} from "@renderer/modules/i18n";
import {useKodoNavigator} from "@renderer/modules/kodo-address";
import {BucketItem} from "@renderer/modules/qiniu-client";

import EmptyHolder from "@renderer/components/empty-holder";
import LoadingHolder from "@renderer/components/loading-holder";

import BucketTableRow from "./bucket-table-row";

interface BucketTableProps {
  loading: boolean,
  buckets: BucketItem[],
  selectedBucket: BucketItem | null,
  onChangeSelectedBucket: (bucket: BucketItem | null) => void,
}

const BucketTable: React.FC<BucketTableProps> = ({
  loading,
  buckets,
  selectedBucket,
  onChangeSelectedBucket,
}) => {
  const {translate} = useI18n();
  const {currentAddress, goTo} = useKodoNavigator();

  const handleClickRow = (bucket: BucketItem) => {
    if (bucket.name === selectedBucket?.name) {
      onChangeSelectedBucket(null);
      return;
    }
    onChangeSelectedBucket(bucket);
  };

  const handleClickBucket = (bucket: BucketItem) => {
    goTo({
      protocol: currentAddress.protocol,
      path: `${bucket.name}/`,
    });
  };

  return (
    <Form className="overflow-auto w-100 h-100">
      <Table size="sm" striped bordered hover>
        <colgroup>
          <col style={{width: "2rem"}}/>
          <col/>
          <col style={{minWidth: "12rem"}}/>
          <col style={{minWidth: "14rem"}}/>
        </colgroup>
        <thead>
        <tr className="sticky-top bg-body">
          <th></th>
          <th>{translate("browse.bucketTable.bucketName")}</th>
          <th>{translate("browse.bucketTable.bucketRegion")}</th>
          <th>{translate("browse.bucketTable.createTime")}</th>
        </tr>
        </thead>
        <tbody>
        {
          loading
            ? <LoadingHolder col={4}/>
            : buckets.length
              ? buckets.map(bucket => (
                <BucketTableRow
                  key={bucket.name}
                  data={bucket}
                  isSelected={selectedBucket?.name === bucket.name}
                  onClickRow={handleClickRow}
                  onClickBucket={handleClickBucket}
                />
              ))
              : <EmptyHolder col={4}/>
        }
        </tbody>
      </Table>
    </Form>
  );
};

export default BucketTable;
