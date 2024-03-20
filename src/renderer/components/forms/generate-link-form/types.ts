import {DomainAdapter} from "@renderer/modules/qiniu-client-hooks";

export interface GenerateLinkFormData {
  domain: DomainAdapter | undefined,
  expireAfter: number, // seconds
}
