import {FileRename} from "@/const/reg-exps";

describe("test ak-history.ts", () => {
    it("test FileRename", () => {
        const cases = [
            {
                name: 'a',
                expect: true,
            },
            {
                name: 'a/a',
                expect: true,
            },
            {
                name: 'a/a',
                expect: true,
            },
            {
                name: 'a//a',
                expect: false,
            },
            {
                name: '/aa',
                expect: false,
            },
            {
                name: 'aa/',
                expect: false,
            },
            {
                name: '/a/a',
                expect: false,
            },
            {
                name: 'a/a/',
                expect: false,
            },
            {
                name: '/a/a/',
                expect: false,
            },
            {
                name: '/',
                expect: false,
            },
        ];
        for (const c of cases) {
            expect(FileRename.test(c.name)).toBe(c.expect);
        }
    });
});
