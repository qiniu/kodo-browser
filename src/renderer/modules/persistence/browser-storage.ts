import Persistence from "./persistence";
import {Serializer} from "@renderer/modules/persistence/serializer";

type Listener =  () => void;

const storageWatcher = (function () {
  const localStorageListeners = new Map<string, Listener>();
  const sessionStorageListeners = new Map<string, Listener>();

  addEventListener('storage', (e) => {
    let listeners = null;
    if (e.storageArea === localStorage) {
      listeners = localStorageListeners;
    } else if (e.storageArea === sessionStorage) {
      listeners = sessionStorageListeners;
    }
    if (!listeners || !e.key) {
      return;
    }
    listeners.get(e.key)?.();
  });

  return {
    watch: (storageArea: Storage, key: string, listener: Listener) => {
      let listeners = null;
      if (storageArea === localStorage) {
        listeners = localStorageListeners;
      } else if (storageArea === sessionStorage) {
        listeners = sessionStorageListeners;
      }
      if (!listeners) {
        return;
      }
      listeners.set(key, listener);
    },
    unwatch: (storageArea: Storage, key: string) => {
      let listeners = null;
      if (storageArea === localStorage) {
        listeners = localStorageListeners;
      } else if (storageArea === sessionStorage) {
        listeners = sessionStorageListeners;
      }
      if (!listeners) {
        return;
      }
      listeners.delete(key);
    }
  }
})();

interface BrowserStorageConfig<T> {
  key: string,
  serializer: Serializer<T>,
  storageArea?: Storage
}

export default class BrowserStorage<T> extends Persistence<T> {
  readonly key: string;
  protected serializer: Serializer<T>;
  readonly storageArea: Storage;

  constructor({
    key,
    serializer,
    storageArea = localStorage,
  }: BrowserStorageConfig<T>) {
    super();
    this.key = key;
    this.serializer = serializer;
    this.storageArea = storageArea;
  }

  protected async _load(): Promise<string | null> {
    return this.storageArea.getItem(this.key) ?? null;
  }

  protected async _save(value: string): Promise<void> {
    this.storageArea.setItem(this.key, value);
  }

  async clear(): Promise<void> {
    this.storageArea.removeItem(this.key);
    return Promise.resolve();
  }

  watch() {
    storageWatcher.watch(this.storageArea, this.key, this.triggerChange);
  }

  unwatch() {
    storageWatcher.unwatch(this.storageArea, this.key);
  }
}
