import {KodoAddress} from "./types"

interface Listener {
  callback: (data: { previous: KodoAddress, current: KodoAddress }) => void
}

export interface KodoNavigatorOptions {
  defaultProtocol: string,
  maxHistory?: number,
  homeItem?: KodoAddress,
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

  private onChangeListener?: Listener

  history: KodoAddress[] = []
  currentIndex: number
  maxHistory: number
  homeItem: KodoAddress

  constructor({
    defaultProtocol,
    maxHistory = 100,
    homeItem,
  }: KodoNavigatorOptions) {
    const defaultItem = {
      protocol: defaultProtocol,
      path: "",
    };

    this.currentIndex = 0;
    this.history.push(homeItem ?? defaultItem);
    this.maxHistory = maxHistory;
    this.homeItem = homeItem ?? defaultItem;
  }

  onChange(callback: Listener["callback"]) {
    this.onChangeListener = {
      callback: callback
    };
  }

  get current(): KodoAddress {
    return this.history[this.currentIndex];
  }

  get bucketName(): string | undefined {
    const [result] = this.current.path.split("/", 1);
    return result || undefined;
  }

  get basePath(): string | undefined {
    const bucketNamer = this.bucketName;
    if (!bucketNamer) {
      return undefined;
    }
    let baseRightPosition = this.current.path.length;
    if (!this.current.path.endsWith("/")) {
      baseRightPosition = this.current.path.lastIndexOf("/") + 1;
    }
    return this.current.path.slice(`${bucketNamer}/`.length, baseRightPosition);
  }

  goTo(kodoAddress: KodoAddress) {
    const previous = this.current;

    if (
      kodoAddress.protocol === previous.protocol &&
      kodoAddress.path === previous.path
    ) {
      return;
    }

    this.history.splice(this.currentIndex + 1);
    this.history.push(kodoAddress);

    if (this.history.length > this.maxHistory) {
      this.history.splice(this.history.length - this.maxHistory);
    }

    this.currentIndex = this.history.length - 1;
    this.onChangeListener?.callback({
      previous,
      current: this.current,
    });
  }

  goBack() {
    if (!this.history[this.currentIndex - 1]) {
      return;
    }
    const previous = this.current;
    this.currentIndex -= 1;
    this.onChangeListener?.callback({
      previous,
      current: this.current,
    });
  }

  goForward() {
    if (!this.history[this.currentIndex + 1]) {
      return;
    }
    const previous = this.current;
    this.currentIndex += 1;
    this.onChangeListener?.callback({
      previous,
      current: this.current,
    });
  }

  goUp(p?: KodoAddress) {
    const current = p ?? this.current;

    this.goTo({
      protocol: current.protocol,
      path: KodoNavigator.getBaseDir(current.path),
    });
  }

  goHome() {
    this.goTo(this.homeItem);
  }

  setHome(home: KodoAddress) {
    this.homeItem = home;
  }
}
