import { mocked } from "ts-jest/utils";

import * as Cipher from './cipher';

import * as KodoNav from '@/const/kodo-nav';
import * as AuthInfo from "./authinfo";

jest.mock("./cipher", () => ({
    __esModule: true,
    cipher: jest.fn(v => v),
    decipher: jest.fn(v => v),
}));

mocked(Cipher);

describe("test authinfo.ts", () => {
    beforeEach(() => {
        localStorage.clear();
    });
    it("get", () => {
        const actual = AuthInfo.get();
        expect(actual).toEqual({});
    });
    it("save and get", () => {
        const expectation = {
            id: "NgKd0BmebvsFERFEBfKVVZGeGn7VsZQe_H_AunOC",
            secret: "lp4Zv3Gi_7CHtxNTcJx2Pum5hUJB3gHROcg4vp0i",
            description: "kodo-qiniu-dev",
            isPublicCloud: true,
            isAuthed: true,
        };
        AuthInfo.save(expectation);
        const actual = AuthInfo.get();
        expect(actual).toEqual(expectation);
    });
    it("saveToAuthInfo", () => {
        const expectation = {
            address: 'kodo://kodo-browser-dev/ahhhh/',
            mode: KodoNav.Mode.LocalFiles,
        }
        AuthInfo.saveToAuthInfo(expectation);
        const actual = AuthInfo.get();
        expect(actual).toEqual(expectation);
    });
    it("remove", () => {
        const expectation = {
            id: "NgKd0BmebvsFERFEBfKVVZGeGn7VsZQe_H_AunOC",
            secret: "lp4Zv3Gi_7CHtxNTcJx2Pum5hUJB3gHROcg4vp0i",
            description: "kodo-qiniu-dev",
            isPublicCloud: true,
            isAuthed: true,
        }
        AuthInfo.save(expectation);
        AuthInfo.remove();
        const actual = AuthInfo.get();
        expect(actual).toEqual({})
    });
    it("usePublicCloud", () => {
        expect(AuthInfo.usePublicCloud()).toBeFalsy();
    });
    it("switchToPublicCloud", () => {
        AuthInfo.switchToPublicCloud();
        expect(AuthInfo.usePublicCloud()).toBeTruthy();
    });
    it("switchToPrivateCloud", () => {
        AuthInfo.switchToPublicCloud();
        AuthInfo.switchToPrivateCloud();
        expect(AuthInfo.usePublicCloud()).toBeFalsy();
    });
})
