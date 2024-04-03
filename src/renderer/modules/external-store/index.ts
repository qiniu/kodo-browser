type Listener = () => void;

export default class ExternalStore<T> {
  protected data: T;
  protected listeners: Set<Listener>;

  constructor(data: T) {
    this.data = data;
    this.listeners = new Set<Listener>();
    this.subscribe = this.subscribe.bind(this);
    this.getSnapshot = this.getSnapshot.bind(this);
    this.dispatch = this.dispatch.bind(this);
  }

  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  getSnapshot() {
    return this.data;
  }

  dispatch(data: Partial<T> | ((prevData: T) => Partial<T>)) {
    this.data = {
      ...this.data,
      ...data,
    };
    this.listeners.forEach(l => l());
  }
}
