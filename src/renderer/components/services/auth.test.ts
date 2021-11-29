jest.mock("electron", () => ({
    __esModule: true,
    ipcRenderer: {
        send: jest.fn(),
    },
}));

jest.mock("./authinfo", () => ({
    __esModule: true,
    save: jest.fn(),
    remove: jest.fn(),
}));

jest.mock("./qiniu-client", () => ({
    __esModule: true,
    listAllBuckets: jest.fn(),
    clearAllCache: jest.fn(),
}));

import { mocked } from "ts-jest/utils";

import { ipcRenderer } from "electron";

import * as AuthInfo from "./authinfo";
import * as QiniuClient from "./qiniu-client";

import * as Auth from "./auth";

describe("test auth.ts", () => {
    const MOCK_AUTH_ID = "NgKd0BmebvsFERFEBfKVVZGeGn7VsZQe_H_AunOC";
    const MOCK_AUTH_SECRET = "NgKd0BmebvsFERFEBfKVVZGeGn7VsZQe_H_AunOC";

    it("test login", async () => {
        await Auth.login({
            id: MOCK_AUTH_ID,
            secret: MOCK_AUTH_SECRET,
            isPublicCloud: true,
        });
        expect(QiniuClient.listAllBuckets).toHaveBeenCalledWith({
            id: MOCK_AUTH_ID,
            secret: MOCK_AUTH_SECRET,
            isPublicCloud: true,
        });
        expect(AuthInfo.save).toBeCalledWith({
            id: MOCK_AUTH_ID,
            secret: MOCK_AUTH_SECRET,
            isPublicCloud: true,
            isAuthed: true,
        })
    });
    it("test logout", async () => {
        const mockedIpcRenderer = mocked(ipcRenderer, true);
        Auth.logout();
        expect(QiniuClient.clearAllCache).toBeCalledTimes(1);
        expect(AuthInfo.remove).toBeCalledTimes(1);
        expect(mockedIpcRenderer.send.mock.calls[0]).toEqual([
            "asynchronous",
            { key: "clearCache" }
        ]);
        expect(mockedIpcRenderer.send.mock.calls[1]).toEqual([
            "asynchronous-job",
            { key: "job-stopall" }
        ]);
    });
});
