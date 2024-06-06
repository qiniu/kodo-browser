import {VerifyShareResult} from "kodo-s3-adapter-sdk/dist/share-service";

import {Sender} from "@common/ipc-actions/types";
import {DeepLinkActionFns, DeepLinkMessage, DeepLinkSignInWithShareSessionMessage} from "@common/ipc-actions/deep-link";

export interface Handler {
  handle(href: string): void,
}

export interface HandlerConstructable {
    new(sender: Sender<any>, channel: string): Handler;
    Host: string;
}

export class SignInHandler implements Handler {
  static Host = "signIn";

  private deepLinkActionFns: DeepLinkActionFns

  constructor(sender: Sender<DeepLinkMessage>, channel: string) {
    this.deepLinkActionFns = new DeepLinkActionFns(sender, channel);
  }

  handle(href: string): void {
    const action = this.getActionName(href);

    switch (action) {
      case "shareLink":
        this.handleSignInWithShareLink(href);
        break;
      case "shareSession":
        this.handleSignInWithShareSession(href);
        break;
    }
  }

  private getActionName(href: string): string {
    const url = new URL(href);
    const [, action] = url.pathname.split("/", 2);
    return action;
  }

  private handleSignInWithShareLink(href: string) {
    // kodobrowser://signIn/shareLink?id={id}&token={token}[&portalHost={portalHost}][&code={code}]
    const url = new URL(href);

    const portalHost = url.searchParams.get("portalHost") || "";
    const id = url.searchParams.get("id") || "";
    const token = url.searchParams.get("token") || "";
    const code = url.searchParams.get("code") || undefined;

    if (!id || !token) {
      this.deepLinkActionFns.signInDataInvalid();
      return;
    }

    this.deepLinkActionFns.signInWithShareLink({
      portalHost,
      shareId: id,
      shareToken: token,
      extractCode: code,
    });
  }

  private handleSignInWithShareSession(href: string) {
    // kodobrowser://signIn/shareSession?data={data}
    // data is the verify response, which is encoded by url-safe base64
    let data: (
      VerifyShareResult
      & {
        description?: string,
      }
    ) | null;
    try {
      const base64Data = (new URL(href).searchParams.get("data") || "")
        .replaceAll('/', '_')
        .replaceAll('+', '-');
      data = JSON.parse(
        Buffer.from(
          base64Data,
          "base64"
        )
          .toString()
      );
    } catch {
      data = null;
    }
    if (data === null) {
      this.deepLinkActionFns.signInDataInvalid();
      return;
    }

    const messageData: DeepLinkSignInWithShareSessionMessage["data"] = {
      accessKey: data.federated_ak,
      accessSecret:data.federated_sk,

      sessionToken: data.session_token,
      bucketName: data.bucket_name,
      bucketId: data.bucket_id,
      regionS3Id: data.region,
      endpoint: data.endpoint,
      prefix: data.prefix,
      permission: data.permission,
      expires: data.expires,
    };
    if (Object.values(messageData).some(v => !v)) {
      this.deepLinkActionFns.signInDataInvalid();
      return;
    }

    if (data.description) {
      messageData.description = data.description;
    }

    this.deepLinkActionFns.signInWithShareSession(messageData);
  }
}
