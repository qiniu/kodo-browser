// convert to web stream api when Node.js >= v21
export interface Serializer<T> {
  serialize(value: T): string,
  deserialize(value: string): T,
}

type JSONPrimitive = string | number | boolean | null | undefined;
type JSONObject<T> = {[K in keyof T & string]?: JSONValue<T[K]>};
type JSONArray<T> = JSONValue<T>[];
export type JSONValue<T> = JSONPrimitive | JSONObject<T> | JSONArray<T>;

export class JSONSerializer<T extends JSONValue<T>> implements Serializer<T> {
  serialize(value: T): string {
    return JSON.stringify(value);
  }

  deserialize(value: string): T {
    return JSON.parse(value);
  }
}
