import mockFs from "mock-fs";
import fs from 'fs'

import { config_path } from "@common/const/app-config";

import * as AkHistory from "./ak-history";

describe("test ak-history.ts", () => {
    const MOCK_AK_HISTORY = {
        isPublicCloud: true,
        accessKeyId: "NgKd0BmebvsFERFEBfKVVZGeGn7VsZQe_H_AunOC",
        accessKeySecret: "lp4Zv3Gi_7CHtxNTcJx2Pum5hUJB3gHROcg4vp0i",
        description: "kodo-browser-dev",
    };

    describe("when empty config", () => {
        beforeEach(() => {
            mockFs({
                [config_path]: { /* mock dir */ },
            });
        });
        afterEach(() => {
            mockFs.restore();
        });
        it("list AkHistory", () => {
            expect(
                fs.existsSync(`${config_path}/ak_histories.json`)
            ).toBeFalsy();
            const akHistoryList = AkHistory.list();
            expect(
                fs.existsSync(`${config_path}/ak_histories.json`)
            ).toBeFalsy();
            expect(akHistoryList).toHaveLength(0);
        });
        it("add AkHistory", () => {
            expect(
                fs.existsSync(`${config_path}/ak_histories.json`)
            ).toBeFalsy();
            AkHistory.add(
                MOCK_AK_HISTORY.isPublicCloud,
                MOCK_AK_HISTORY.accessKeyId,
                MOCK_AK_HISTORY.accessKeySecret,
                MOCK_AK_HISTORY.description,
            );
            const akHistory = AkHistory.list().pop();
            expect(akHistory).toEqual(MOCK_AK_HISTORY);
        });
        it("remove AkHistory", () => {
            expect(
                fs.existsSync(`${config_path}/ak_histories.json`)
            ).toBeFalsy();
            expect(() => {
                AkHistory.remove(MOCK_AK_HISTORY.accessKeyId)
            }).not.toThrow();
            expect(
                fs.existsSync(`${config_path}/ak_histories.json`)
            ).toBeTruthy();
        });
        it("clearAll AkHistory", () => {
            expect(
                fs.existsSync(`${config_path}/ak_histories.json`)
            ).toBeFalsy();
            expect(() => {
                AkHistory.clearAll()
            }).not.toThrow();
            expect(
                fs.existsSync(`${config_path}/ak_histories.json`)
            ).toBeTruthy();
        });
    });
    describe("when some data in config", () => {
        const EXIST_AK_HISTORY = {
            isPublicCloud: true,
            accessKeyId: "NgKd9BmebvsFERFEBfKVVZGeGn7VsZQe_H_AunOC",
            accessKeySecret: "lp5Zv3Gi_7CHtxNTcJx2Pum5hUJB3gHROcg4vp0i",
            description: "kodo-browser-dev-exist",
        }
        const EXIST_MOCK_CONTENT = `{"historyItems":[${JSON.stringify(EXIST_AK_HISTORY)}]}`

        beforeEach(() => {
            mockFs({
                [config_path]: {
                    "ak_histories.json": EXIST_MOCK_CONTENT,
                },
            });
        });
        afterEach(() => {
            mockFs.restore();
        });

        it("list AkHistory", () => {
            expect(
                fs.existsSync(`${config_path}/ak_histories.json`)
            ).toBeTruthy();
            const akHistoryList = AkHistory.list();
            expect(akHistoryList).toHaveLength(1);
            const akHistory = akHistoryList.pop();
            expect(akHistory).toEqual(EXIST_AK_HISTORY);
        });

        it("add AkHistory", () => {
            expect(
                fs.existsSync(`${config_path}/ak_histories.json`)
            ).toBeTruthy();
            AkHistory.add(
                MOCK_AK_HISTORY.isPublicCloud,
                MOCK_AK_HISTORY.accessKeyId,
                MOCK_AK_HISTORY.accessKeySecret,
                MOCK_AK_HISTORY.description,
            );
            const akHistoryList = AkHistory.list();
            expect(akHistoryList).toHaveLength(2);
            expect(akHistoryList.pop()).toEqual(MOCK_AK_HISTORY);
            expect(akHistoryList.pop()).toEqual(EXIST_AK_HISTORY);
        });

        it("remove AkHistory", () => {
            expect(
                fs.existsSync(`${config_path}/ak_histories.json`)
            ).toBeTruthy();
            AkHistory.remove(EXIST_AK_HISTORY.accessKeyId);
            const akHistoryList = AkHistory.list();
            expect(akHistoryList).toHaveLength(0);
        });

        it("clearAll AkHistory", () => {
            expect(
                fs.existsSync(`${config_path}/ak_histories.json`)
            ).toBeTruthy();
            AkHistory.add(
                MOCK_AK_HISTORY.isPublicCloud,
                MOCK_AK_HISTORY.accessKeyId,
                MOCK_AK_HISTORY.accessKeySecret,
                MOCK_AK_HISTORY.description,
            );
            AkHistory.clearAll();
            expect(AkHistory.list()).toHaveLength(0);
            AkHistory.add(
                MOCK_AK_HISTORY.isPublicCloud,
                MOCK_AK_HISTORY.accessKeyId,
                MOCK_AK_HISTORY.accessKeySecret,
                MOCK_AK_HISTORY.description,
            );
            AkHistory.clearAll();
            expect(AkHistory.list()).toHaveLength(0);
        });
    });
});
