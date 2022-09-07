import {Persistence} from "./types";

type JSONValue = string
  | number
  | boolean
  | null
  | JSONValue[]
  | {[k: string | number]: JSONValue};

class BrowserLocalStorage implements Persistence {
  save(key: string, value: JSONValue, encode?: (d: string) => string): void {
    let v = JSON.stringify(value);
    if (encode) {
      v = encode(v);
    }
    localStorage.setItem(key, v);
  }

  read(key: string, decode?: (d: string) => string): any {
    let v = localStorage.getItem(key) ?? "";
    if (decode) {
      v = decode(v);
    }
    if (!v) {
      return null;
    }
    return JSON.parse(v);
  }

  delete(key: string) {
    localStorage.removeItem(key);
  }

  clear() {
    localStorage.clear();
  }
}

export default new BrowserLocalStorage();
