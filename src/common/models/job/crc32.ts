import fs from "fs";
import stream from "stream";

// @ts-ignore
import {CRC32Stream} from "crc32-stream";

export default function (filePath: string): Promise<string> {
    const fileStream = fs.createReadStream(filePath);
    const checksum = new CRC32Stream();
    const emptyConsumer = new stream.Writable({
        write(_chunk: Buffer, _encoding: BufferEncoding, callback: (error?: (Error | null)) => void) {
            callback();
        }
    });

    return new Promise<string>(resolve => {
        fileStream
            .pipe(checksum)
            .pipe(emptyConsumer)
            .on("finish", () => {
                resolve(checksum.hex());
            });
    });
}
