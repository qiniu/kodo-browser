export interface BucketItem {
  id: string;
  name: string;
  createDate: Date;
  regionId?: string;
  regionName?: string,
  grantedPermission?: 'readonly' | 'readwrite';
}
