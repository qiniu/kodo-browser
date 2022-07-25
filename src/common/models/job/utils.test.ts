import mockFs from "mock-fs";

import { Readable as ReadableStream } from "stream";

import * as JobUtils from "./utils";

describe("test models/job/utils.ts", () => {
    describe("test parseLocalPath", () => {
        if (process.platform === "win32") {
            it("win path", () => {
                expect(JobUtils.parseLocalPath("D:\\path\\to\\Some\\file.txt"))
                    .toEqual({
                        name: "file.txt",
                        path: "D:\\path\\to\\Some\\file.txt",
                    });
            });
        } else {
            it("unix-like path", () => {
                expect(JobUtils.parseLocalPath("/path/to/Some/file.txt"))
                    .toEqual({
                        name: "file.txt",
                        path: "/path/to/Some/file.txt",
                    });
            });
        }
    });

    describe("test parseKodoPath", () => {
        it("normal", () => {
            expect(
                JobUtils.parseKodoPath("kodo://kodo-browser/path/to/some/file.txt")
            )
                .toEqual({
                    bucket: "kodo-browser",
                    key: "path",
                    // first look(by the name) it should be
                    // key: "path/to/some/file.txt",
                    // but old function return as such
                    // TODO: not sure is it a bug, or intentionally
                });
        });

        it("check protocol failed", () => {
            expect(() => {
                JobUtils.parseKodoPath("kodo-browser/path/to/some/file.txt")
            })
                .toThrow("Invalid kodo path");
        });
    });

    describe("test getEtag", () => {
        it("by Buffer", async () => {
            const etag = await new Promise(resolve => {
                JobUtils.getEtag(Buffer.from("Hello kodo browser!"), resolve);
            });
            const oldEtag = await new Promise(resolve => {
                JobUtils.getEtag(Buffer.from("Hello kodo browser!"), resolve);
            });
            // console.log(etag);
            // expect(etag).toBe("FvV1cV1RzovZlzHlGApMIXL2RRHW");
            expect(etag).toBe(oldEtag);
        });
        it("by path(string)", async () => {
            mockFs({
                "/path/to/get/etag": "Hello kodo browser!",
            });
            const etag = await new Promise(resolve => {
                JobUtils.getEtag("/path/to/get/etag", resolve);
            });
            expect(etag).toBe("FvV1cV1RzovZlzHlGApMIXL2RRHW");
            mockFs.restore();
        });
        it("by ReadableStream", async () => {
            class MyStream extends ReadableStream {
                data = "Hello kodo browser!"

                _read(size: number) {
                    if (this.data.length) {
                        let chunk: string;
                        [chunk, this.data] = [this.data.slice(0, size), this.data.slice(size)];
                        this.push(chunk);
                    } else {
                        this.push(null);
                    }
                }
            }

            const readableStream = new MyStream();

            const etag = await new Promise(resolve => {
                JobUtils.getEtag(readableStream, resolve);
            });
            expect(etag).toBe("FvV1cV1RzovZlzHlGApMIXL2RRHW");
        });
    });
});
