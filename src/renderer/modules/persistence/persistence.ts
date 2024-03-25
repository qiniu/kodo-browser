import {Serializer} from "./serializer";

interface ChangeData<T> {
  value: T,
}

type Listener<T> = {
  callback: (data: ChangeData<T | null>) => void
}

export default abstract class Persistence<T> {
  protected abstract serializer: Serializer<T>;
  protected listeners = new Set<Listener<T>>();

  protected constructor() {
    this.triggerChange = this.triggerChange.bind(this);
  }

  protected abstract _save(value: string): Promise<void>;
  protected abstract _load(): Promise<string | null>;
  abstract clear(): Promise<void>;
  abstract watch(): void;
  abstract unwatch(): void;

  async save(value: T): Promise<void> {
    const encodedData = this.serializer.serialize(value);
    await this._save(encodedData);
  }

  async load(): Promise<T | null> {
    const encodedData = await this._load();
    if (!encodedData) {
      return null;
    }
    return this.serializer.deserialize(encodedData);
  }

  onChange(callback: Listener<T>["callback"]): void {
    this.listeners.add({
      callback,
    });
  }

  offChange(callback: Listener<T>["callback"]): void {
    for (let listener of this.listeners) {
      if (listener.callback === callback) {
        this.listeners.delete(listener);
        return;
      }
    }
  }

  protected triggerChange() {
    this.load()
      .then(value => {
        this.listeners.forEach(l => l.callback({value}));
      });
  }
}
