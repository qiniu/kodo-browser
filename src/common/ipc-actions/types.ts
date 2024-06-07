export interface Sender<T> {
  send(channel: string, message: T): void,
}
