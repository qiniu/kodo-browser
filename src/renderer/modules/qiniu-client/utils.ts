import { KODO_MODE, Region } from "kodo-s3-adapter-sdk";
import { Domain } from "kodo-s3-adapter-sdk/dist/adapter";
import { Path as QiniuPath } from "qiniu-path/dist/src/path";

import * as AppConfig from "@common/const/app-config";
import * as KodoNav from "@renderer/const/kodo-nav";

import {debugRequest, debugResponse, GetAdapterOptionParam, getDefaultClient} from './common'
import {checkFileExists, checkFolderExists} from "./files";

export async function isQueryRegionAPIAvailable(ucUrl: string): Promise<boolean> {
    try {
        await Region.query({
            accessKey: '',
            bucketName: '',
            ucUrl: ucUrl,
            appName: 'kodo-browser',
            appVersion: AppConfig.app.version,
            requestCallback: debugRequest(KODO_MODE),
            responseCallback: debugResponse(KODO_MODE),
        });
        return true;
    } catch (err: any) {
        if (err.res && err.res.statusCode === 404) {
            return false;
        }
        if (err.code && (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED')) {
            return false;
        }
        return true;
    }
}

export async function listDomains(region: string, bucket: string, opt: GetAdapterOptionParam): Promise<Domain[]> {
    return await getDefaultClient(opt).enter("listDomains", async client => {
        return await client.listDomains(region, bucket);
    }, {
        targetBucket: bucket,
    });
}

export function parseKodoPath(s3Path: string) {
    if(
        !s3Path
        || !s3Path.includes(KodoNav.ADDR_KODO_PROTOCOL)
        || s3Path === KodoNav.ADDR_KODO_PROTOCOL
    ) {
        return {};
    }

    const str = s3Path.substring(KodoNav.ADDR_KODO_PROTOCOL.length);
    const index = str.indexOf("/");
    let bucketName;
    let key = "";
    if (index < 0) {
        bucketName = str;
    } else {
        bucketName = str.substring(0, index);
        key = str.substring(index + 1);
    }

    return {
        bucketName,
        key,
    };
}

// why this function not in files.ts?
// because it just calls checkFolderExists and checkFileExists,
// in difference file will easy to test.(just check it calls correct methods)
export function checkFileOrDirectoryExists(
  region: string,
  bucket: string,
  prefix: QiniuPath | string,
  opt: GetAdapterOptionParam,
): Promise<boolean> {
  if (prefix.toString().endsWith("/")) {
    return checkFolderExists(
      region,
      bucket,
      prefix,
      opt,
    );
  } else {
    return checkFileExists(
      region,
      bucket,
      prefix,
      opt,
    );
  }
}
