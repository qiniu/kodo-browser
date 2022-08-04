import mockFs from "mock-fs";

import crc32Async from "./crc32";
import ByteSize from "@common/const/byte-size";

describe("test crc32", () => {
    beforeAll(() => {
        mockFs({
            "/path/to": {
                "file": "hello kodo browser!\n",
                "320KB-a.data": Buffer.alloc(5 * 64 * ByteSize.KB).fill(0x61), // 0x61 === 'a'
            },
        });
    });
    afterAll(() => {
        mockFs.restore();
    });

    it("test crc32Async", async () => {
        const actual = await crc32Async("/path/to/file");

        expect(actual).toBe("F9629E23");
    });

    it("test crc32Async read at least 3 times", async () => {
        // Because crc32-stream is a transform stream, it doesn't consume readable stream.
        // The default highWaterMark of file readable stream is 64KB, so we mock a 5 * 64KB file.
        const actual = await crc32Async("/path/to/320KB-a.data");

        expect(actual).toBe("61399770");
    });
});
