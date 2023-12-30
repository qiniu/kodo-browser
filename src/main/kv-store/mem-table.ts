import WriteAheadLogging from "./wal";

interface MemTableOptions<T>{
  wal: WriteAheadLogging<T> | string,
  nodes?: Map<string, T | null>,
}

export class MemTableReadonly<T> {
  wal: WriteAheadLogging<T>
  nodes: Map<string, T | null>

  constructor({
    wal,
    nodes,
  }: MemTableOptions<T>) {
    if (typeof wal === "string") {
      this.wal = new WriteAheadLogging<T>({
        filePath: wal,
      });
    } else {
      this.wal = wal;
    }
    this.nodes = nodes ?? new Map<string, T | null>();
  }

  async init({
    nodes,
  }: {
    nodes?: Map<string, T | null>,
  } = {}): Promise<void> {
    if (!nodes) {
      const items = await this.wal.getAll();
      this.nodes = new Map(Object.entries(items));
      return;
    }
    this.nodes = nodes;
  }

  async close(): Promise<void> {
    await this.wal.close();
    this.nodes = new Map();
  }

  has(key: string): boolean {
    return this.nodes.has(key);
  }

  get(key: string): T | undefined {
    const result = this.nodes.get(key);
    return result ? result : undefined;
  }

  get size(): number {
    return this.nodes.size;
  }

  * iter({
    sorted = true
  } = {}): Generator<[string, T | null], void> {
    let entries: Iterable<[string, T | null]> = this.nodes.entries();
    if (sorted) {
      entries = Array
        .from(this.nodes.entries())
        .sort(([a], [b]) => {
          if (a === b) {
            return 0
          } else {
            return a < b ? -1 : 1
          }
        });
    }
    for (const e of entries) {
      yield e;
    }
  }
}

export class MemTable<T> extends MemTableReadonly<T> {
  async set(key: string, val: T) {
    await this.wal.set(key, val);
    return this.nodes.set(key, val);
  }

  async del(key: string) {
    await this.wal.del(key);
    this.nodes.set(key, null);
  }
}
