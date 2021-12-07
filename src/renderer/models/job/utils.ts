import path from "path";
import crypto from "crypto";
import { Readable as ReadableStream } from "stream";
import fs from "fs";

import * as KodoNav from "@/const/kodo-nav"

export interface LocalPath {
    name: string,
    path: string,
    size?: number,
    mtime?: number,
}
// parseLocalPath: get name and path from local path
export function parseLocalPath(p: string): LocalPath {
    return {
        name: path.basename(p),
        path: p,
    };
}

export interface RemotePath {
    bucket: string,
    key: string,
    size?: number,
    mtime?: number,
}
// parseKodoPath: get bucket and key from KodoPath
export function parseKodoPath(kodoPath: string): RemotePath {
    if (!kodoPath.startsWith(KodoNav.ADDR_KODO_PROTOCOL)) {
        throw Error("Invalid kodo path");
    }

    const [bucket, key] = kodoPath
        .substring(KodoNav.ADDR_KODO_PROTOCOL.length)
        .split('/', 2);
    return {
        bucket,
        key: key.replace(/\\/g, "/"),
    };
}

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
    // 以4M为单位分割，why?
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
