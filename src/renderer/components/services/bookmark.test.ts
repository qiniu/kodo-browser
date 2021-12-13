import { mocked } from "ts-jest/utils";

import mockFs from "mock-fs";
import fs from 'fs'

import { config_path } from "@/const/app-config";
import * as KodoNav from "@/const/kodo-nav";

import * as AuthInfo from "./authinfo";
import * as Bookmark from "./bookmark";

jest.mock("./authinfo", () => ({
    __esModule: true,
    get: jest.fn().mockReturnValue({ id: "NgKd0BmebvsFERFEBfKVVZGeGn7VsZQe_H_AunOC" }),
}));

mocked(AuthInfo);

describe("test bookmark.ts", () => {
    const MOCK_AUTH_ID = "NgKd0BmebvsFERFEBfKVVZGeGn7VsZQe_H_AunOC";
    beforeAll(() => {
        expect(AuthInfo.get()).toEqual({
            id: MOCK_AUTH_ID,
        });
    });

    afterAll(() => {
        jest.clearAllMocks()
    });

    describe("when empty config", () => {
        beforeEach(() => {
            mockFs({
                [config_path]: { /* mock dir */ },
            });
        });
        afterEach(() => {
            mockFs.restore();
        });
        it("list bookmark", () => {
            expect(
                fs.existsSync(`${config_path}/bookmarks_${MOCK_AUTH_ID}.json`)
            ).toBeFalsy();
            const bookmarks = Bookmark.list();
            expect(
                fs.existsSync(`${config_path}/bookmarks_${MOCK_AUTH_ID}.json`)
            ).toBeFalsy();
            expect(bookmarks).toHaveLength(0);
        });
        it('add bookmark and marked bookmark', () => {
            expect(
                fs.existsSync(`${config_path}/bookmarks_${MOCK_AUTH_ID}.json`)
            ).toBeFalsy();
            const MOCK_PATH = `${KodoNav.ADDR_KODO_PROTOCOL}kodo-browser-dev/`;
            const MOCK_MODE = KodoNav.Mode.LocalFiles;
            Bookmark.add(MOCK_PATH, MOCK_MODE);
            expect(Bookmark.marked(MOCK_PATH, MOCK_MODE)).toBeTruthy();
        });
        it('remove bookmarks', () => {
            expect(
                fs.existsSync(`${config_path}/bookmarks_${MOCK_AUTH_ID}.json`)
            ).toBeFalsy();
            const MOCK_PATH = `${KodoNav.ADDR_KODO_PROTOCOL}kodo-browser-dev/`;
            const MOCK_MODE = KodoNav.Mode.LocalFiles;
            expect(() => {
                Bookmark.remove(MOCK_PATH, MOCK_MODE);
            }).not.toThrow();
            expect(
                fs.existsSync(`${config_path}/bookmarks_${MOCK_AUTH_ID}.json`)
            ).toBeTruthy();
        });
    });
    describe("when some data in config", () => {
        const EXIST_MOCK_PATH = `${KodoNav.ADDR_KODO_PROTOCOL}kodo-browser-dev/`;
        const EXIST_MOCK_MODE = KodoNav.Mode.LocalFiles;
        const EXIST_MOCK_CONTENT = `{"bookmarks":[{"fullPath":"${EXIST_MOCK_PATH}","mode":"${EXIST_MOCK_MODE}","timestamp":1634293740}]}`;

        beforeEach(() => {
            mockFs({
                [config_path]: {
                    [`bookmarks_${MOCK_AUTH_ID}.json`]: EXIST_MOCK_CONTENT,
                },
            });
        });
        afterEach(() => {
            mockFs.restore();
        });
        it("list bookmark", () => {
            expect(
                fs.existsSync(`${config_path}/bookmarks_${MOCK_AUTH_ID}.json`)
            ).toBeTruthy();
        });
        it("marked bookmark", () => {
            expect(
                fs.existsSync(`${config_path}/bookmarks_${MOCK_AUTH_ID}.json`)
            ).toBeTruthy();
            expect(
                Bookmark.marked(EXIST_MOCK_PATH, EXIST_MOCK_MODE)
            ).toBeTruthy();
        });
        it("marked bookmark not match", () => {
            expect(
                fs.existsSync(`${config_path}/bookmarks_${MOCK_AUTH_ID}.json`)
            ).toBeTruthy();
            const NOT_MATCH_PATH = `${EXIST_MOCK_PATH}/not-exist-bookmark`;
            const NOT_MATCH_MODE = KodoNav.Mode.LocalBuckets;
            expect(NOT_MATCH_MODE).not.toEqual(EXIST_MOCK_MODE);
            expect(
                Bookmark.marked(NOT_MATCH_PATH, NOT_MATCH_MODE)
            ).toBeFalsy();
            expect(
                Bookmark.marked(EXIST_MOCK_PATH, NOT_MATCH_MODE)
            ).toBeFalsy();
            expect(
                Bookmark.marked(NOT_MATCH_PATH, EXIST_MOCK_MODE)
            ).toBeFalsy();
        });
        it("add bookmark", () => {
            expect(
                fs.existsSync(`${config_path}/bookmarks_${MOCK_AUTH_ID}.json`)
            ).toBeTruthy();
            const MOCK_PATH = `${KodoNav.ADDR_KODO_PROTOCOL}kodo-browser-test/`;
            const MOCK_MODE = KodoNav.Mode.LocalFiles;
            Bookmark.add(MOCK_PATH, MOCK_MODE);
            expect(
                Bookmark.marked(MOCK_PATH, MOCK_MODE)
            ).toBeTruthy();
            expect(
                Bookmark.marked(EXIST_MOCK_PATH, EXIST_MOCK_MODE)
            ).toBeTruthy();
            expect(Bookmark.list()).toHaveLength(2);
        });
        it("remove bookmarks", () => {
            expect(
                fs.existsSync(`${config_path}/bookmarks_${MOCK_AUTH_ID}.json`)
            ).toBeTruthy();
            Bookmark.remove(EXIST_MOCK_PATH, EXIST_MOCK_MODE);
            expect(Bookmark.marked(EXIST_MOCK_PATH, EXIST_MOCK_MODE)).toBeFalsy();
            expect(Bookmark.list()).toHaveLength(0);
        });
        it("remove bookmarks not match", () => {
            expect(
                fs.existsSync(`${config_path}/bookmarks_${MOCK_AUTH_ID}.json`)
            ).toBeTruthy();
            const NOT_MATCH_PATH = `${EXIST_MOCK_PATH}/not-exist-bookmark`;
            const NOT_MATCH_MODE = KodoNav.Mode.LocalBuckets;
            expect(NOT_MATCH_MODE).not.toEqual(EXIST_MOCK_MODE);
            Bookmark.remove(NOT_MATCH_PATH, NOT_MATCH_MODE);
            expect(Bookmark.marked(EXIST_MOCK_PATH, EXIST_MOCK_MODE)).toBeTruthy();
            Bookmark.remove(NOT_MATCH_PATH, EXIST_MOCK_MODE);
            expect(Bookmark.marked(EXIST_MOCK_PATH, EXIST_MOCK_MODE)).toBeTruthy();
            Bookmark.remove(EXIST_MOCK_PATH, NOT_MATCH_MODE);
            expect(Bookmark.marked(EXIST_MOCK_PATH, EXIST_MOCK_MODE)).toBeTruthy();
            expect(Bookmark.list()).toHaveLength(1);
        });
    });
});
