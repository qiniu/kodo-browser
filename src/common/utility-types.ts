type Primitive = null | undefined | string | number | boolean | symbol | bigint;

type IsTuple<T extends ReadonlyArray<any>> = number extends T["length"] ? false : true;
type TupleKeys<T extends ReadonlyArray<any>> = Exclude<keyof T, keyof any[]>;

declare type PathImpl<K extends string | number, V> = V extends Primitive ? `${K}` : `${K}` | `${K}.${PropsPath<V>}`;

// Example: PropsPath<{a: {b: string}}> = "a" | "a.b"
export declare type PropsPath<T> = T extends ReadonlyArray<infer V>
  ? IsTuple<T> extends true
    ? {
      [K in TupleKeys<T>]-?: PathImpl<K & string, T[K]>;
    }[TupleKeys<T>]
    : PathImpl<number, V>
  : {
    [K in keyof T]-?: PathImpl<K & string, T[K]>;
  }[keyof T];

export declare type PathValue<T, P extends PropsPath<T>> = T extends any
  ? P extends `${infer K}.${infer R}`
    ? K extends keyof T
      ? R extends PropsPath<T[K]>
        ? PathValue<T[K], R>
        : never
      : K extends number
        ? T extends ReadonlyArray<infer V>
          ? PathValue<V, R & PropsPath<V>>
          : never
        : never
    : P extends keyof T
      ? T[P]
      : P extends number
        ? T extends ReadonlyArray<infer V>
          ? V
          : never
        : never
  : never;


export declare type OptionalProps<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export declare type RequireProps<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
