type Encode<T> = (value: T) => any
type Decode<T> = (value: any) => T

export interface Persistence<M = Record<string, any>> {
  save(
    key: keyof M,
    value: M[keyof M],
    encode?: Encode<M[keyof M]>
  ): void,

  read(
    key: keyof M,
    decode?: Decode<M[keyof M]>
  ): M[keyof M],

  delete(key: keyof M): void,

  clear(): void,

  use?(sub?: Persistence): void,
}
