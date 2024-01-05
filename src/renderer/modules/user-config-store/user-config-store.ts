import lodash from "lodash";

import {PropsPath, PathValue} from "@common/utility-types";

import {Persistence} from "@renderer/modules/persistence";
import ExternalStore from "@renderer/modules/external-store";

export interface UserConfigStoreOptions<T> {
  defaultData: T,
  persistence?: Persistence<Partial<T>>,
  manualLoadPersistence?: boolean,
  onLoadError?: (err: Error) => void,
}

interface UserConfigStoreState {
  initialized: boolean,
  loadingPersistence: boolean,
  loadError: Error | null,
  changedPersistenceValue: boolean,
}

class UserConfigStore<T> {
  private _state: UserConfigStoreState;
  private readonly defaultData: T;
  private data: Partial<T>;
  private _store?: ExternalStore<{
    state: UserConfigStoreState,
    data: T,
  }>;
  readonly persistence?: Persistence<Partial<T>>;
  private _loadPersistencePromise: Promise<void> | null = null;
  private isWatchingPersistence: boolean = false;
  private handleLoadError?: (err: Error) => void;

  constructor({
    defaultData,
    persistence,
    manualLoadPersistence = false,
    onLoadError,
  }: UserConfigStoreOptions<T>) {
    this._state = {
      initialized: false,
      loadingPersistence: false,
      loadError: null,
      changedPersistenceValue: false,
    };
    this.defaultData = defaultData;
    this.data = {};
    this.persistence = persistence;
    if (this.persistence && !manualLoadPersistence) {
      this._loadPersistencePromise = this.loadFromPersistence();
    }
    if (!this.persistence) {
      this._state.initialized = true;
    }
    this.handleLoadError = onLoadError;
    this.handlePersistenceChange = this.handlePersistenceChange.bind(this);
  }

  get state() {
    return lodash.cloneDeep(this._state);
  }

  get loadPersistencePromise() {
    return this._loadPersistencePromise;
  }

  get<TKey extends PropsPath<T>>(key: TKey): PathValue<T, TKey> {
    let result = lodash.get(
      this.data,
      key,
    );
    if (!result) {
      result = lodash.get(this.defaultData, key);
    }
    return result;
  }

  async set<TKey extends PropsPath<T>>(key: TKey, val: PathValue<T, TKey>) {
    const newData = lodash.cloneDeep(this.data);
    lodash.set(newData as object, key, val);
    await this.saveToPersistence(newData);
    this.data = newData;
    this._store?.dispatch({
      data: this.getAll(),
    });
  }

  getAll(): T {
    return lodash.merge({}, this.defaultData, this.data);
  }

  async setAll(val: Partial<T>) {
    const newData = lodash.merge({}, this.data, val);
    await this.saveToPersistence(newData);
    this.data = newData;
    this._store?.dispatch({
      data: this.getAll(),
    });
  }

  async reset() {
    await this.persistence?.clear();
    this.data = {};
  }

  get store() {
    if (this._store) {
      return this._store;
    }

    this._store = new ExternalStore({
      state: this._state,
      data: this.getAll(),
    });
    return this._store;
  }

  loadFromPersistence(force = false): Promise<void> {
    if (this._loadPersistencePromise && !force) {
      return this._loadPersistencePromise;
    }
    this._loadPersistencePromise = this._loadFromPersistence();
    return this._loadPersistencePromise;
  }

  private async _loadFromPersistence() {
    if (!this.persistence) {
      return;
    }

    this._state.loadingPersistence = true
    this._store?.dispatch({
      state: this._state,
    });
    try {
      const data = await this.persistence.load();
      // if `data` is null, it's ok by the `lodash.merge` doing nothing
      this.data = lodash.merge(this.data, data);
      this._state.initialized = true;
    } catch (err: any) {
      this._state.loadError = err;
      this.handleLoadError?.(err);
    } finally {
      this._state.loadingPersistence = false;
      this._store?.dispatch({
        state: this._state,
        data: this.getAll(),
      });
    }
  }

  async saveToPersistence(data: Partial<T>) {
    if (!this.persistence) {
      return;
    }
    if (this.isWatchingPersistence) {
      // prevent dispatch twice when save spontaneously
      this.unwatchPersistence();
      await this.persistence.save(data);
      this.watchPersistence();
    } else {
      await this.persistence.save(data);
    }
  }

  watchPersistence() {
    if (!this.persistence || this.isWatchingPersistence) {
      return;
    }

    this.persistence.onChange(this.handlePersistenceChange);
    this.persistence.watch();
    this.isWatchingPersistence = true;
  }

  unwatchPersistence() {
    if (!this.persistence) {
      return;
    }

    this.persistence.unwatch();
    this.persistence.offChange(this.handlePersistenceChange);
    this.isWatchingPersistence = false;
  }

  private handlePersistenceChange({value}: { value: Partial<T> | null }) {
    this.data = !value ? {} : value;
    this._state.changedPersistenceValue = !this._state.changedPersistenceValue;
    this._store?.dispatch({
      state: this.state,
      data: this.getAll(),
    });
  }
}

export default UserConfigStore;
