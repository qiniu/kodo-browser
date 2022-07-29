import mockFs from "mock-fs";
import {Readable as ReadableStream} from "stream";

import {getEtag} from "./etag";

describe("test getEtag", () => {
    it("by Buffer", async () => {
        const etag = await new Promise(resolve => {
            getEtag(Buffer.from("Hello kodo browser!"), resolve);
        });
        expect(etag).toBe("FvV1cV1RzovZlzHlGApMIXL2RRHW");
    });
    it("by path(string)", async () => {
        mockFs({
            "/path/to/get/etag": "Hello kodo browser!",
        });
        const etag = await new Promise(resolve => {
            getEtag("/path/to/get/etag", resolve);
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
            getEtag(readableStream, resolve);
        });
        expect(etag).toBe("FvV1cV1RzovZlzHlGApMIXL2RRHW");
    });
});
