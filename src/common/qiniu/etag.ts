import crypto from "crypto";
import { Readable as ReadableStream } from "stream";
import fs from "fs";

// get etag
function sha1(content: Buffer): Buffer {
    return crypto.createHash("sha1")
        .update(content)
        .digest();
}
function calcEtag(sha1StringList: Buffer[], blockCount: number): string {
    if (!sha1StringList.length) {
        return 'Fto5o-5ea0sNMlW_75VgGJCv2AcJ';
    }
    let sha1Buffer = Buffer.concat(sha1StringList, blockCount * 20);

    let prefix = 0x16;
    // 如果大于4M，则对各个块的sha1结果再次sha1，why?
    if (blockCount > 1){
        prefix = 0x96;
        sha1Buffer = sha1(sha1Buffer);
    }

    sha1Buffer = Buffer.concat([Buffer.from([prefix]), sha1Buffer], sha1Buffer.length + 1);

    return sha1Buffer.toString('base64')
        .replace(/\//g,'_').replace(/\+/g,'-');
}
function getEtagByBuffer(content: Buffer, callback: (etag: string) => void): void {
    // 以4M为单位分割，why?
    const blockSize = 4*1024*1024;
    const blockCount = Math.ceil(content.length / blockSize);
    const sha1String = chunk(content, blockSize).map(sha1);

    process.nextTick(function(){
        callback(calcEtag(sha1String, blockCount));
    });

    function chunk(buffer: Buffer, size: number): Buffer[] {
        const result = Array(Math.ceil(buffer.length / size));
        let index = 0;
        let resIndex = 0;

        while (index < buffer.length) {
            result[resIndex++] = buffer.slice(index, (index += size));
        }
        return result;
    }
}
function getEtagByStream(dataStream: ReadableStream, callback: (etag: string) => void): void {
    // 以 4M 为单位分割，why?
    // 对外暴露的方法仅有自动下载新版本，猜测时用于验证是否下载完整，后续 crc 上线后需要修改这里
    // 4M 是上传新版本到七牛空间时采用的分片
    const blockSize = 4*1024*1024;
    const sha1String: Buffer[] = [];
    let blockCount = 0;

    dataStream.on('readable', function() {
        let chunk;
        while (chunk = dataStream.read(blockSize)) {
            sha1String.push(sha1(chunk));
            blockCount++;
        }
    });
    dataStream.on('end',function(){
        callback(calcEtag(sha1String, blockCount));
    });
}
function getEtagByPath(path: string, callback: (etag: string) => void): void {
    const dataStream = fs.createReadStream(path);
    getEtagByStream(dataStream, callback)
}
export function getEtag(data: Buffer | string | ReadableStream, callback: (etag: string) => void): void {
    if (typeof data === 'string') {
        getEtagByPath(data, callback);
        return
    }
    if (data instanceof ReadableStream){
        getEtagByStream(data, callback);
        return;
    }
    getEtagByBuffer(data, callback);
}
