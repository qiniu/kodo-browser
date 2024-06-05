import {KodoAddress} from "./types"

type OnChangeListener = (data: { previous: KodoAddress, current: KodoAddress }) => void;

export interface KodoNavigatorOptions {
  defaultProtocol: string,
  maxHistory?: number,
  initAddress?: KodoAddress,
  lockPrefix?: string,
}

export class KodoNavigator {
  static getBaseDir(path: string): string {
    const currentPathArr = path.split("/");
    const upPathArr = path.endsWith("/")
      ? currentPathArr.slice(0, -2)
      : currentPathArr.slice(0, -1);
    if (!upPathArr.length) {
      return "";
    }
    return upPathArr.join("/") + "/";
  }

  private onChangeListeners: Set<OnChangeListener> = new Set();

  history: KodoAddress[] = []
  currentIndex: number
  maxHistory: number
  lockPrefix: string

  constructor({
    defaultProtocol,
    maxHistory = 100,
    initAddress,
    lockPrefix,
  }: KodoNavigatorOptions) {
    const defaultItem = {
      protocol: defaultProtocol,
      path: "",
    };

    this.currentIndex = 0;
    this.history.push(initAddress ?? defaultItem);
    this.maxHistory = maxHistory;
    this.lockPrefix = lockPrefix ?? "";
  }

  onChange(callback: OnChangeListener) {
    this.onChangeListeners.add(callback);
  }

  offChange(callback: OnChangeListener) {
    this.onChangeListeners.delete(callback);
  }

  get current(): KodoAddress {
    return {
      ...this.history[this.currentIndex],
    };
  }

  get bucketName(): string | undefined {
    const [result] = this.current.path.split("/", 1);
    return result || undefined;
  }

  get basePath(): string | undefined {
    const bucketName = this.bucketName;
    if (!bucketName) {
      return undefined;
    }
    let basePath = this.current.path;
    if (!this.current.path.endsWith("/")) {
      basePath = KodoNavigator.getBaseDir(basePath);
    }
    return basePath.slice(`${bucketName}/`.length);
  }

  goTo(kodoAddress: KodoAddress, override: true): void
  goTo(kodoAddress: Partial<KodoAddress>, override?: false): void
  goTo(kodoAddress: KodoAddress, override: boolean = false): void {
    const previous = this.current;
    const next: KodoAddress = override
      ? kodoAddress
      : {
        ...previous,
        ...kodoAddress,
      };

    if (!next.path.startsWith(this.lockPrefix)) {
      return;
    }

    // address may not equal by external path
    // it will better if using protocol to tell which is which
    const nProps = Object.keys(next);
    const pProps = Object.keys(previous);
    const isPropsEqual =
      nProps.every(nKey => pProps.includes(nKey));

    // check already in path
    if (
      next.protocol === previous.protocol &&
      next.path === previous.path &&
      isPropsEqual
    ) {
      return;
    }

    this.history.splice(this.currentIndex + 1);
    this.history.push(next);

    if (this.history.length > this.maxHistory) {
      this.history.splice(this.history.length - this.maxHistory);
    }

    this.currentIndex = this.history.length - 1;
    this.onChangeListeners.forEach(l => l({
      previous,
      current: this.current,
    }));
  }

  goBack() {
    if (!this.history[this.currentIndex - 1]) {
      return;
    }
    const previous = this.current;
    this.currentIndex -= 1;
    this.onChangeListeners.forEach(l => l({
      previous,
      current: this.current,
    }));
  }

  goForward() {
    if (!this.history[this.currentIndex + 1]) {
      return;
    }
    const previous = this.current;
    this.currentIndex += 1;
    this.onChangeListeners.forEach(l => l({
      previous,
      current: this.current,
    }));
  }

  goUp(p?: KodoAddress) {
    const current = p ?? this.current;

    this.goTo({
      path: KodoNavigator.getBaseDir(current.path),
    });
  }
}
