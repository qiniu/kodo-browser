import { KODO_MODE, Qiniu, Region, S3_MODE } from "kodo-s3-adapter-sdk"
import { NatureLanguage } from "kodo-s3-adapter-sdk/dist/uplog";
import { Kodo as KodoAdapter } from "kodo-s3-adapter-sdk/dist/kodo"
import { S3 as S3Adapter } from "kodo-s3-adapter-sdk/dist/s3"
import { RegionService } from "kodo-s3-adapter-sdk/dist/region_service";


import * as AppConfig from "@common/const/app-config";
import * as LocalLogger from "@renderer/modules/local-logger";

import {privateEndpointPersistence} from "./endpoint";

export function debugRequest(mode: string) {
    return (request: any) => {
        LocalLogger.info(
            '>>',
            mode,

            'REQ_URL:',
            request?.url,

            'REQ_METHOD:',
            request?.method,

            'REQ_HEADERS:',
            request?.headers,

            'REQ_DATA:',
            request?.data,
        );
    };
}

export function debugResponse(mode: string) {
    return (response: any) => {
      LocalLogger.info(
            '<<',
            mode,

            'REQ_URL:',
            response?.request?.url,

            'REQ_METHOD:',
            response?.request?.method,

            'REQ_HEADERS: ',
            response?.request?.headers,

            'REQ_DATA: ',
            response?.request?.data,

            'RESP_STATUS:',
            response?.statusCode,

            'RESP_HEADERS:',
            response?.headers,

            'RESP_INTERVAL:',
            response?.interval,

            'ms RESP_DATA:',
            response?.data,

            'RESP_ERROR:',
            response?.error,
        );
    };
}

const kodoAdaptersCache: { [id: string] : KodoAdapter } = {};
const s3AdaptersCache: { [id: string] : S3Adapter } = {};
const regionServicesCache: { [id: string] : RegionService } = {};

function makeAdapterCacheKey(accessKey: string, secretKey: string, ucUrl?: string) {
    return `${accessKey}:${secretKey}:${ucUrl}`;
}

function getQiniuAdapter(
    accessKey: string,
    secretKey: string,
    ucUrl: string | undefined = undefined,
    regions: Region[] = [],
) {
    return new Qiniu(
        accessKey,
        secretKey,
        ucUrl,
        `Kodo-Browser/${AppConfig.app.version}`,
        regions,
    );
}

// reference kodo-s3-adapter-sdk/adapter.ts > AdapterOption
interface AdapterOption {
    // for kodo-s3-adapter-sdk/Qiniu
    accessKey: string,
    secretKey: string,
    regions: Region[],
    ucUrl?: string,

    // for kodo-s3-adapter-sdk/Qiniu.prototype.mode
    appName: string,
    appVersion: string,
    appNatureLanguage: NatureLanguage,

    // for getAdapterOption
    preferKodoAdapter?: boolean,
    preferS3Adapter?: boolean,

    // for uplog
    uplogBufferSize?: number, // when <0 disable uplog
}

export interface GetAdapterOptionParam {
    id: string,
    secret: string,
    isPublicCloud: boolean,
    preferKodoAdapter?: boolean,
    preferS3Adapter?: boolean,
}

function getAdapterOption(opt: GetAdapterOptionParam): AdapterOption {
    let baseResult = {
        accessKey: opt.id,
        secretKey: opt.secret,
        appName: AppConfig.app.id,
        appVersion: AppConfig.app.version,
        // TODO: get from @renderer/modules/settings or pass by opt
        appNatureLanguage: localStorage.getItem("lang") as NatureLanguage ?? 'zh-CN',
        regions: [],
    };
    let result: AdapterOption;
    if (opt.isPublicCloud) {
        result = {
            ...baseResult,
            ucUrl: undefined,
        };
    } else {
        const privateEndpoint = privateEndpointPersistence.read();
        result = {
            ...baseResult,
            ucUrl: privateEndpoint.ucUrl,
            // disable uplog when use customize cloud
            // because there isn't a valid access key of uplog
            uplogBufferSize: -1,
        }
    }
    if (opt.preferS3Adapter) {
        result.preferS3Adapter = opt.preferS3Adapter;
    }

    return result;
}

export function clientBackendMode(opt: GetAdapterOptionParam): string {
    const adapterOption = getAdapterOption(opt);
    if (
      adapterOption.regions.length > 0 &&
      !adapterOption.preferKodoAdapter ||
      adapterOption.preferS3Adapter ||
      !opt.isPublicCloud
    ) {
        return S3_MODE;
    } else {
        return KODO_MODE;
    }
}

function getS3Client(opt: GetAdapterOptionParam): S3Adapter {
    const adapterOption = getAdapterOption(opt);
    const cacheKey = makeAdapterCacheKey(adapterOption.accessKey, adapterOption.secretKey, adapterOption.ucUrl);

    if (s3AdaptersCache[cacheKey]) {
        return s3AdaptersCache[cacheKey];
    } else {
        const qiniuAdapter = getQiniuAdapter(
            adapterOption.accessKey,
            adapterOption.secretKey,
            adapterOption.ucUrl,
            adapterOption.regions,
        );
        const s3Client = qiniuAdapter.mode(S3_MODE, {
            appName: adapterOption.appName,
            appVersion: adapterOption.appVersion,
            appNatureLanguage: adapterOption.appNatureLanguage,
            requestCallback: debugRequest(S3_MODE),
            responseCallback: debugResponse(S3_MODE),
            uplogBufferSize: adapterOption.uplogBufferSize,
        }) as S3Adapter;
        s3AdaptersCache[cacheKey] = s3Client;
        return s3Client;
    }
}

function getKodoClient(opt: GetAdapterOptionParam): KodoAdapter {
    const adapterOption = getAdapterOption(opt);
    const cacheKey = makeAdapterCacheKey(adapterOption.accessKey, adapterOption.secretKey, adapterOption.ucUrl);

    if (kodoAdaptersCache[cacheKey]) {
        return kodoAdaptersCache[cacheKey];
    } else {
        const qiniuAdapter = getQiniuAdapter(
            adapterOption.accessKey,
            adapterOption.secretKey,
            adapterOption.ucUrl,
            adapterOption.regions,
        );
        const kodoClient = qiniuAdapter.mode(KODO_MODE, {
            appName: adapterOption.appName,
            appVersion: adapterOption.appVersion,
            appNatureLanguage: adapterOption.appNatureLanguage,
            requestCallback: debugRequest(KODO_MODE),
            responseCallback: debugResponse(KODO_MODE),
            uplogBufferSize: adapterOption.uplogBufferSize,
        }) as KodoAdapter;
        kodoAdaptersCache[cacheKey] = kodoClient;
        return kodoClient;
    }
}

export function getDefaultClient(opt: GetAdapterOptionParam): KodoAdapter | S3Adapter {
    switch (clientBackendMode(opt)) {
        case S3_MODE:
            return getS3Client(opt);
        case KODO_MODE:
            return getKodoClient(opt);
    }
    throw new Error("unknown backend mode")
}

export function getRegionService(opt: GetAdapterOptionParam): RegionService {
    const adapterOption = getAdapterOption(opt);
    const cacheKey = makeAdapterCacheKey(
        adapterOption.accessKey,
        adapterOption.secretKey,
        adapterOption.ucUrl,
    );

    if (regionServicesCache[cacheKey]) {
        return regionServicesCache[cacheKey];
    }

    const regionService = new RegionService(adapterOption);
    regionServicesCache[cacheKey] = regionService;
    return regionService;
}

export function clearAllCache() {
    Object.keys(s3AdaptersCache).forEach((key) => {
        s3AdaptersCache[key].clearCache();
        delete s3AdaptersCache[key];
    });
    Object.keys(kodoAdaptersCache).forEach((key) => {
        kodoAdaptersCache[key].clearCache();
        delete kodoAdaptersCache[key];
    });
    Object.keys(regionServicesCache).forEach((key) => {
        regionServicesCache[key].clearCache();
        delete regionServicesCache[key];
    });
}

