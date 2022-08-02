import * as formatter from "./formatter";
import * as ServicesUtil from "@/components/services/util";
import {Path as QiniuPath} from "qiniu-path/dist/src/path";
import * as FileItem from "@/models/file-item";
import {ItemType} from "@/models/file-item";

describe("formatter test", () => {
    describe("sub", () => {
        it("name", () => {
            expect(formatter.sub.name).toBe("sub")
        });
        it("sub length less than origin length", () => {
            expect(formatter.sub.fn("kodo-browser", 4)).toBe("kodo...")
        });
        it("sub length great than origin length", () => {
            expect(formatter.sub.fn("kodo-browser", 16)).toBe("kodo-browser")
        });
        it("sub length equal origin length", () => {
            expect(formatter.sub.fn("kodo", 4)).toBe("kodo")
        });
    });
    describe("hideSecret", () => {
        it("name", () => {
            expect(formatter.hideSecret.name).toBe("hideSecret");
        });
        it("origin string length less than 6", () => {
            expect(formatter.hideSecret.fn("kodo_"));
        });
        it("origin string length great than or equal 6", () => {
            expect(formatter.hideSecret.fn("_kodo_")).toBe("_ko****do_");
            expect(formatter.hideSecret.fn("kodo-browser")).toBe("kod****ser");
        });
    });
    describe("timeFormat", () => {
        const dateToFormat = new Date("2021-11-24T05:37:07.948Z");
        it("name", () => {
            expect(formatter.timeFormat.name).toBe("timeFormat");
        });
        it("format time with param type string", () => {
            expect(formatter.timeFormat.fn("2021-11-24 05:37:07")).toBe("2021-11-24 05:37:07");
        });
        it("format time with invalid string param", () => {
            expect(formatter.timeFormat.fn("kodo-invalid")).toBe("");
        });
        it("format time with param type number", () => {
            expect(formatter.timeFormat.fn(dateToFormat.getTime())).toBe("2021-11-24 05:37:07");
        });
        it("format time with NaN param", () => {
            expect(formatter.timeFormat.fn(NaN)).toBe("");
        });
        it("format time with param type Date", () => {
            expect(formatter.timeFormat.fn(dateToFormat)).toBe("2021-11-24 05:37:07");
        });
    });
    describe("elapse", () => {
        it("name", () => {
            expect(formatter.elapse.name).toBe("elapse");
        });
        it("elapse invalid date", () => {
            const startDate = new Date("2021-11-24T05:37:00.000Z");
            let endDate = new Date("2021-11-24T05:37:00.999Z");
            expect(formatter.elapse.fn(startDate.getTime(), NaN))
                .toBe("");
            expect(formatter.elapse.fn(NaN, endDate.getTime()))
                .toBe("");
            expect(formatter.elapse.fn(NaN, NaN))
                .toBe("");
            endDate = new Date("2021-11-24T05:36:00.999Z");
            expect(formatter.elapse.fn(startDate.getTime(), endDate.getTime()))
                .toBe(0)
        });
        it("elapse milliseconds", () => {
            const startDate = new Date("2021-11-24T05:37:00.000Z");
            let endDate = new Date("2021-11-24T05:37:00.999Z");
            expect(formatter.elapse.fn(startDate.getTime(), endDate.getTime()))
                .toBe("999ms")
        });
        it("elapse seconds", () => {
            const startDate = new Date("2021-11-24T05:37:00.000Z");
            let endDate = new Date("2021-11-24T05:37:01.000Z");
            expect(formatter.elapse.fn(startDate.getTime(), endDate.getTime()))
                .toBe("1s");
            endDate = new Date("2021-11-24T05:37:59.999Z");
            expect(formatter.elapse.fn(startDate.getTime(), endDate.getTime()))
                .toBe("59s");
        });
        it("elapse minutes", () => {
            const startDate = new Date("2021-11-24T05:37:00.000Z");
            let endDate = new Date("2021-11-24T05:38:00.000Z");
            expect(formatter.elapse.fn(startDate.getTime(), endDate.getTime()))
                .toBe("1m");
            endDate = new Date("2021-11-24T06:36:59.999Z");
            expect(formatter.elapse.fn(startDate.getTime(), endDate.getTime()))
                .toBe("59m59s");
        });
        it("elapse hours", () => {
            const startDate = new Date("2021-11-24T05:37:00.000Z");
            let endDate = new Date("2021-11-24T06:37:00.000Z");
            expect(formatter.elapse.fn(startDate.getTime(), endDate.getTime()))
                .toBe("1h");
            endDate = new Date("2021-11-24T07:36:59.999Z");
            expect(formatter.elapse.fn(startDate.getTime(), endDate.getTime()))
                .toBe("1h59m59s");
        });
    });
    describe("leftTimeFormat", () => {
        it("name", () => {
            expect(formatter.leftTimeFormat.name).toBe("leftTimeFormat");
        });
        it("just called another function", () => {
            const spiedLeftTime = jest.spyOn(ServicesUtil, "leftTime");
            formatter.leftTimeFormat.fn(1000);
            expect(ServicesUtil.leftTime).toBeCalledWith(1000);
            spiedLeftTime.mockRestore();
        });
    });
    describe("sizeFormat", () => {
        it("name", () => {
            expect(formatter.sizeFormat.name).toBe("sizeFormat");
        });
        it("zero", () => {
            expect(formatter.sizeFormat.fn(0, false))
                .toBe("0");
            expect(formatter.sizeFormat.fn(NaN, false))
                .toBe("0");
            expect(formatter.sizeFormat.fn(-1, false))
                .toBe("0");
        });
        it("B", () => {
            expect(formatter.sizeFormat.fn(1, false))
                .toBe("1B");
            expect(formatter.sizeFormat.fn(1023, false))
                .toBe("1023B");
            expect(formatter.sizeFormat.fn(1, true))
                .toBe("1B");
        });
        it("KB", () => {
            expect(formatter.sizeFormat.fn(1024, false))
                .toBe("1K");
            expect(formatter.sizeFormat.fn(Math.pow(1024, 2) - 1, false))
                .toBe("1023K1023B");
            expect(formatter.sizeFormat.fn(Math.pow(1024, 2) - 512, true))
                .toBe("1023.5KB");
            expect(formatter.sizeFormat.fn(Math.pow(1024, 2) - 1024, true))
                .toBe("1023KB");
            expect(formatter.sizeFormat.fn(Math.pow(1024, 2) - 1, true))
                .toBe("1024KB");
        });
        it("MB", () => {
            expect(formatter.sizeFormat.fn(Math.pow(1024, 2), false))
                .toBe("1M");
            expect(formatter.sizeFormat.fn(Math.pow(1024, 3) - 1, false))
                .toBe("1023M1023K1023B");
            expect(formatter.sizeFormat.fn(Math.pow(1024, 3) - Math.pow(1024, 2), true))
                .toBe("1023MB");
            expect(formatter.sizeFormat.fn(Math.pow(1024, 3) - 1, true))
                .toBe("1024MB");
        });
        it("GB", () => {
            expect(formatter.sizeFormat.fn(Math.pow(1024, 3), false))
                .toBe("1G");
            expect(formatter.sizeFormat.fn(Math.pow(1024, 4) - 1, false))
                .toBe("1023G1023M1023K1023B");
            expect(formatter.sizeFormat.fn(Math.pow(1024, 4) - Math.pow(1024, 3), true))
                .toBe("1023GB");
            expect(formatter.sizeFormat.fn(Math.pow(1024, 4) - 1, true))
                .toBe("1024GB");
        });
    });
    describe("percent", () => {
        it("name", () => {
            expect(formatter.percent.name).toBe("persent");
        });
        it("special zero", () => {
            expect(formatter.percent.fn(0, 0, ""))
                .toBe(0);
        });
        it("finished", () => {
            expect(formatter.percent.fn(0, 0, "finished"))
                .toBe(100);
        });
        it("normal", () => {
            expect(formatter.percent.fn(0, 0, ""))
                .toBe(0);
            expect(formatter.percent.fn(1, 0, ""))
                .toBe(100);
            expect(formatter.percent.fn(40, 80, ""))
                .toBe(50);
            expect(formatter.percent.fn(128, 1024, ""))
                .toBe(12.5);
        });
    });
    describe("fileIcon", () => {
        function getMockDataOfQiniuPath(name: string, ext?: string) {
            const nameWithExt = `${name}${ext ? "." + ext : ""}`
            return new QiniuPath(
                "/",
                "/",
                `/kodo-browser/filters/formatter/${nameWithExt}`,
                `.${ext}`,
                ["kodo-browser", "filters", "formatter", nameWithExt],
                false,
            )
        }
        it("name", () => {
            expect(formatter.fileIcon.name).toBe("fileIcon");
        });
        it("icon", () => {
            const testCases: {
                exts: string[],
                isFolder?: boolean,
                exceptResult: string,
            }[] = [
                {
                    exts: [""],
                    isFolder: true,
                    exceptResult: "folder",
                },
                {
                    exts: [
                        "mp4",
                        "webm",
                        "mov",
                        "ogv",
                        "flv",
                    ],
                    exceptResult: "file-video-o",
                },
                {
                    exts: ["mp3", "ogg"],
                    exceptResult: "file-audio-o",
                },
                {
                    exts: [
                        "png",
                        "jpg",
                        "jpeg",
                        "bmp",
                        "gif",
                    ],
                    exceptResult: "file-image-o",
                },
                {
                    exts: ["doc", "docx"],
                    exceptResult: "file-word-o",
                },
                {
                    exts: ["pdf"],
                    exceptResult: "file-pdf-o",
                },
                {
                    exts: ["ppt", "pptx"],
                    exceptResult: "file-powerpoint-o",
                },
                {
                    exts: ["exl"],
                    exceptResult: "file-excel-o",
                },
                {
                    exts: ["txt"],
                    exceptResult: "file-text-o",
                },
                {
                    exts: [
                        "gz",
                        "tar",
                        "zip",
                        "jar",
                        "bz",
                        "war",
                        "xz",
                    ],
                    exceptResult: "file-zip-o",
                },
                {
                    exts: ["pkg"],
                    exceptResult: "dropbox",
                },
                {
                    exts: ["app", "dmg"],
                    exceptResult: "apple",
                },
                {
                    exts: ["apk"],
                    exceptResult: "android",
                },
                {
                    exts: [
                        "msi",
                        "deb",
                        "bin",
                        "exe",
                    ],
                    exceptResult: "cog",
                },
                {
                    exts: ["img", "iso"],
                    exceptResult: "dot-circle-o",
                },
                {
                    exts: ["cmd", "sh"],
                    exceptResult: "terminal",
                },
            ];
            for (const testCase of testCases) {
                for (const ext of testCase.exts) {
                    expect(formatter.fileIcon.fn({
                        bucket: "test-formatter-fileIcon",
                        name: testCase.isFolder
                            ? "folder"
                            : `file.${ext}`,
                        path: getMockDataOfQiniuPath("picture", ext),
                        itemType: testCase.isFolder
                            ? FileItem.ItemType.Directory
                            : ItemType.File,
                        size: 1 << 10,
                        storageClass: "Normal",
                        lastModified: new Date("2021-11-24T03:50:25.855Z"),
                        withinFourHours: false,
                    }))
                        .toBe(testCase.exceptResult);
                }
            }
        });
    });
    describe("htmlEscape", () => {
        it("name", () => {
            expect(formatter.htmlEscape.name).toBe("htmlEscape");
        });
        it("simple test with some symbols needed replace", () => {
            expect(formatter.htmlEscape.fn(`<header><h1>读书笔记</h1><p>2021-04-26</p><p>标签：math basic-math book-note</p></header>`))
                .toBe(`&#60;header&#62;&#60;h1&#62;&#35835;&#20070;&#31508;&#35760;&#60;/h1&#62;&#60;p&#62;2021-04-26&#60;/p&#62;&#60;p&#62;&#26631;&#31614;：math basic-math book-note&#60;/p&#62;&#60;/header&#62;`);
        });
    });
    describe("i18n", () => {
        const nameI18n = {
            "zh-CN": '简体中文',
            "en-US": "English(US)",
        };
        it("normal", () => {
            expect(formatter.i18n.fn(nameI18n, "zh-CN")).toBe("简体中文");
            expect(formatter.i18n.fn(nameI18n, "en-US")).toBe("English(US)");
        });
        it("fallback", () => {
            expect(formatter.i18n.fn(nameI18n, "ja-JP")).toBe("");
            expect(formatter.i18n.fn(nameI18n, "ja-JP", "unknown")).toBe("unknown");
            expect(formatter.i18n.fn(nameI18n, "ja-JP", "unknown")).toBe("unknown");
        });
    });
});
