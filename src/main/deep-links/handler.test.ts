import {MockedObjectDeep} from "ts-jest/dist/utils/testing";
import {mocked} from "ts-jest/utils";

import {Sender} from "@common/ipc-actions/types";
import {DeepLinkMessage} from "@common/ipc-actions/deep-link";

import {SignInHandler} from "./handler";

describe("SignInHandler", () => {
  let handler: SignInHandler;
  let mockSender: MockedObjectDeep<Sender<DeepLinkMessage>>;

  beforeEach(() => {
    mockSender = mocked({
      send: jest.fn<void, [string, DeepLinkMessage]>()
    }, true);
    handler = new SignInHandler(mockSender, "mockedChannel");
  });

  describe("handleSignInWithShareLink", () => {
    it("should call SignInWithShareLink with correct parameters", () => {
      handler.handle("kodo-browser://signIn/shareLink?id=123&token=abc&extractCode=def");
      expect(mockSender.send).toHaveBeenCalledWith("mockedChannel", {
        action: "SignInWithShareLink",
        data: {
          shareId: "123",
          shareToken: "abc",
          extractCode: "def",
        },
      });
    });

    it("should call SignInDataInvalid if id or token is lost", () => {
      handler.handle("kodo-browser://signIn/shareLink?token=abc");
      expect(mockSender.send).toHaveBeenCalledWith("mockedChannel", {
        action: "SignInDataInvalid",
      })
    });
  });

  describe("handleSignInWithShareSession", () => {
    it("should call SignInWithShareSession with correct parameters", () => {
      const data = {
        federated_ak: "ak",
        federated_sk: "sk",
        session_token: "token",
        bucket_name: "bucket",
        bucket_id: "id",
        region: "region",
        endpoint: "endpoint",
        prefix: "prefix",
        permission: "permission",
        expires: "expires",
      };
      const encodedData = Buffer.from(JSON.stringify(data)).toString("base64");
      handler.handle(`kodo-browser://signIn/shareSession?data=${encodedData}`);
      expect(mockSender.send).toHaveBeenCalledWith("mockedChannel", {
        action: "SignInWithShareSession",
        data: {
          accessKey: "ak",
          accessSecret: "sk",
          sessionToken: "token",
          bucketName: "bucket",
          bucketId: "id",
          regionS3Id: "region",
          endpoint: "endpoint",
          prefix: "prefix",
          permission: "permission",
          expires: "expires",
        },
      });
    });

    it("should call SignInDataInvalid if data is not valid base64", () => {
      handler.handle("kodo-browser://signIn/shareSession?data=invalid");
      expect(mockSender.send).toHaveBeenCalledWith("mockedChannel", {
        action: "SignInDataInvalid",
      });
    });

    it("should call SignInDataInvalid if data is not valid JSON", () => {
      const encodedData = Buffer.from("invalid").toString("base64");
      handler.handle(`kodo-browser://signIn/shareSession?data=${encodedData}`);
      expect(mockSender.send).toHaveBeenCalledWith("mockedChannel", {
        action: "SignInDataInvalid",
      });
    });

    it("should call SignInDataInvalid if any required field is lost", () => {
      const data = {
        federated_ak: "ak",
        federated_sk: "sk",
        session_token: "token",
        bucket_name: "bucket",
        bucket_id: "id",
        region: "region",
        endpoint: "endpoint",
        prefix: "prefix",
        permission: "permission",
        // lost expires
      };
      const encodedData = Buffer.from(JSON.stringify(data)).toString("base64");
      handler.handle(`kodo-browser://signIn/shareSession?data=${encodedData}`);
      expect(mockSender.send).toHaveBeenCalledWith("mockedChannel", {
        action: "SignInDataInvalid",
      });
    });
  });
});
