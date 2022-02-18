import { KODO_MODE, Region } from "kodo-s3-adapter-sdk";
import { Domain } from "kodo-s3-adapter-sdk/dist/adapter";
import { Path as QiniuPath } from "qiniu-path/dist/src/path";

import * as AppConfig from "@/const/app-config";
import * as KodoNav from "@/const/kodo-nav";

import {debugRequest, debugResponse, GetAdapterOptionParam, getDefaultClient} from './common'

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

export async function signatureUrl(
    region: string,
    bucket: string,
    key: QiniuPath,
    domain: Domain | undefined,
    expires: number,
    opt: GetAdapterOptionParam,
): Promise<URL> {
    const deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + expires || 60);

    return await getDefaultClient(opt).enter("signatureUrl", async client => {
        return await client.getObjectURL(
            region,
            {
                bucket,
                key: key.toString(),
            },
            domain,
            deadline,
        );
    }, {
        targetBucket: bucket,
        targetKey: key.toString(),
    });
}
