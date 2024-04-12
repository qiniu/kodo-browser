import {Sender} from "./types";

export enum DeepLinkAction {
  RendererReady = "RendererReady",
  RendererClose = "RendererClose",
  SignInWithShareLink = "SignInWithShareLink",
  SignInWithShareSession = "SignInWithShareSession",
  SignInDataInvalid = "SignInDataInvalid",
}

export interface DeepLinkSignInWithShareLinkMessage {
  action: DeepLinkAction.SignInWithShareLink,
  data: {
    apiHost?: string,
    shareId: string,
    shareToken: string,
    extractCode?: string,
  },
}

export interface DeepLinkSignInWithShareSessionMessage {
  action: DeepLinkAction.SignInWithShareSession,
  data: {
    accessKey: string,
    accessSecret: string,
    description?: string,

    sessionToken: string,
    bucketName: string,
    bucketId: string,
    regionS3Id: string,
    endpoint: string,
    prefix: string,
    permission: 'READONLY' | 'READWRITE',
    expires: string,
  },
}

export interface DeepLinkSignInDataInvalidMessage {
  action: DeepLinkAction.SignInDataInvalid,
}

export interface DeepLinkRendererReadyMessage {
  action: DeepLinkAction.RendererReady,
}

export interface DeepLinkRendererCloseMessage {
  action: DeepLinkAction.RendererClose,
}

export type DeepLinkMessage = DeepLinkSignInWithShareLinkMessage
  | DeepLinkSignInWithShareSessionMessage
  | DeepLinkSignInDataInvalidMessage
  | DeepLinkRendererReadyMessage
  | DeepLinkRendererCloseMessage;

export class DeepLinkActionFns {
  constructor(
    private readonly sender: Sender<DeepLinkMessage>,
    private readonly channel: string,
  ) {
  }

  signInWithShareLink(data: DeepLinkSignInWithShareLinkMessage["data"]) {
    this.sender.send(this.channel, {
      action: DeepLinkAction.SignInWithShareLink,
      data,
    });
  }

  signInWithShareSession(data: DeepLinkSignInWithShareSessionMessage["data"]) {
    this.sender.send(this.channel, {
      action: DeepLinkAction.SignInWithShareSession,
      data,
    });
  }

  signInDataInvalid() {
    this.sender.send(this.channel, {
      action: DeepLinkAction.SignInDataInvalid,
    });
  }

  rendererReady() {
    this.sender.send(this.channel, {
      action: DeepLinkAction.RendererReady,
    });
  }

  rendererClose() {
    this.sender.send(this.channel, {
      action: DeepLinkAction.RendererClose,
    });
  }
}
