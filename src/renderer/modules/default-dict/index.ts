/*
* Change some default values which are hard coded in project
* */
interface Dict {
  LOGIN_ENDPOINT_TYPE?: string,
  PRIVATE_ENDPOINT?: {
    ucUrl: string,
    regions: {
      identifier: string,
      label: string,
      endpoint: string,
    }[],
  },
  BASE_SHARE_URL?: string,
  DISABLE_NON_OWNED_DOMAIN?: boolean,
  PREFERENCE_VALIDATORS?: {
    maxMultipartUploadPartSize?: number,
    maxMultipartUploadConcurrency?: number,
    maxUploadJobConcurrency?: number,
    maxDownloadJobConcurrency?: number,
  },
  MAX_SHARE_DIRECTORY_EXPIRE_AFTER_SECONDS?: number,
}

const dict: Dict = {};

export function get<T extends keyof Dict>(key: T): Dict[T] {
  return dict[key];
}

export function set<T extends keyof Dict>(key: T, val: Dict[T]) {
  dict[key] = val;
}
