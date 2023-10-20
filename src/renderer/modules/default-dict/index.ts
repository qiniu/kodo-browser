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
}

const dict: Dict = {};

export function get<T extends keyof Dict>(key: T): Dict[T] {
  return dict[key];
}

export function set<T extends keyof Dict>(key: T, val: Dict[T]) {
  dict[key] = val;
}
