type Primitive = null | undefined | string | number | boolean | symbol | bigint;

type IsTuple<T extends ReadonlyArray<any>> = number extends T['length'] ? false : true;
type TupleKeys<T extends ReadonlyArray<any>> = Exclude<keyof T, keyof any[]>;

declare type PathImpl<K extends string | number, V> = V extends Primitive ? `${K}` : `${K}` | `${K}.${PropsPath<V>}`;

// Example: PropsPath<{a: {b: string}}> = "a" | "a.b"
export declare type PropsPath<T> = T extends ReadonlyArray<infer V> ? IsTuple<T> extends true ? {
  [K in TupleKeys<T>]-?: PathImpl<K & string, T[K]>;
}[TupleKeys<T>] : PathImpl<number, V> : {
  [K in keyof T]-?: PathImpl<K & string, T[K]>;
}[keyof T];
