import path from "path";

import {app} from "electron";

import {Handler, HandlerConstructable, SignInHandler} from "./handler";
import {Sender} from "@common/ipc-actions/types";

const SCHEME_NAME = "kodo-browser";

export class DeepLinkRegister {
  private handlers: Record<string, Handler | undefined> = {};
  private pendingDeepLink?: string;

  constructor(
    private handlerTypes: HandlerConstructable[] = [
      SignInHandler,
    ],
  ) {
  }

  initialize() {
    switch (process.platform) {
      case "darwin":
        app.on("open-url", (_event, url) => {
          if (url && url.startsWith(SCHEME_NAME)) {
            this.handleDeepLink(url);
          }
        });
        break;
      case "win32":
      case "linux":
        const lastArg = process.argv.pop();
        if (lastArg && lastArg.startsWith(SCHEME_NAME)) {
          this.handleDeepLink(lastArg);
        }
        app.on('second-instance', (_event, commandLine, _workingDirectory) => {
          const url = commandLine.pop();
          if (url && url.startsWith(SCHEME_NAME)) {
            this.handleDeepLink(url);
          }
        });
        break;
    }

    app.once("ready", () => {
      if (process.defaultApp) {
        if (process.argv.length >= 2) {
          app.setAsDefaultProtocolClient(SCHEME_NAME, process.execPath, [path.resolve(process.argv[1])]);
        }
      } else {
        app.setAsDefaultProtocolClient(SCHEME_NAME);
      }
    });
  }

  enable(sender: Sender<any>, channel = "DeepLinks") {
    // deep link enabling;
    this.handlerTypes.forEach(t => {
      this.handlers[t.Host] = new t(sender, channel);
    });
    if (this.pendingDeepLink) {
      // handle pending link
      this.handleDeepLink(this.pendingDeepLink);
      this.pendingDeepLink = undefined;
    }
  }

  disable() {
    this.handlers = {};
  }

  handleDeepLink(href: string) {
    if (!Object.keys(this.handlers).length) {
      // no handlers, pending
      this.pendingDeepLink = href;
      return;
    }

    const url = new URL(href);
    // handle link by appropriate handler
    this.handlers[url.host]?.handle(href);
  }
}
