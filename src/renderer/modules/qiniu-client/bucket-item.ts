import {BackendMode} from "@common/qiniu";

export interface BucketItem {
  id: string;
  name: string;
  createDate: Date;
  regionId?: string;
  regionName?: string,
  grantedPermission?: 'readonly' | 'readwrite',
  preferBackendMode?: BackendMode,
  remark?: string,
}
