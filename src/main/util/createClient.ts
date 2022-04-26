import {Qiniu} from "kodo-s3-adapter-sdk";
import {Adapter, RequestInfo, ResponseInfo} from "kodo-s3-adapter-sdk/dist/adapter";
import {ModeOptions} from "kodo-s3-adapter-sdk/dist/qiniu";
import {NatureLanguage} from "kodo-s3-adapter-sdk/dist/uplog";

import * as AppConfig from "@common/const/app-config";
import {ClientOptions} from "@common/ipc-actions/upload";
import {BackendMode} from "@common/const/qiniu";

export default function createQiniuClient(
    clientOptions: ClientOptions,
    options: {
        userNatureLanguage: NatureLanguage,
        isDebug: boolean,
    },
): Adapter {
    const qiniu = new Qiniu(
        clientOptions.accessKey,
        clientOptions.secretKey,
        clientOptions.ucUrl,
        `Kodo-Browser/${AppConfig.app.version}/ioutil`,
        clientOptions.regions,
    );
    const modeOptions: ModeOptions = {
        appName: 'kodo-browser/ioutil',
        appVersion: AppConfig.app.version,
        appNatureLanguage: options.userNatureLanguage,
        // disable uplog when use customize cloud
        // because there isn't a valid access key of uplog
        uplogBufferSize: clientOptions.ucUrl ? -1 : undefined,
    };
    if (options.isDebug) {
        modeOptions.requestCallback = debugRequest(clientOptions.backendMode);
        modeOptions.responseCallback = debugResponse(clientOptions.backendMode);
    }
    return qiniu.mode(
        clientOptions.backendMode,
        modeOptions,
    );
}


function debugRequest(mode: BackendMode) {
    return (request: RequestInfo) => {
        let url = undefined, method = undefined, headers = undefined;
        if (request) {
            url = request.url;
            method = request.method;
            headers = request.headers;
        }
        console.info('>>', mode, 'REQ_URL:', url, 'REQ_METHOD:', method, 'REQ_HEADERS:', headers);
    };
}

function debugResponse(mode: BackendMode) {
    return (response: ResponseInfo) => {
        let requestUrl = undefined, requestMethod = undefined, requestHeaders = undefined,
            responseStatusCode = undefined, responseHeaders = undefined, responseInterval = undefined, responseData = undefined, responseError = undefined;
        if (response) {
            responseStatusCode = response.statusCode;
            responseHeaders = response.headers;
            responseInterval = response.interval;
            responseData = response.data;
            responseError = response.error;
            if (response.request) {
                requestUrl = response.request.url;
                requestMethod = response.request.method;
                requestHeaders = response.request.headers;
            }
        }
        console.info('<<', mode, 'REQ_URL:', requestUrl, 'REQ_METHOD:', requestMethod, 'REQ_HEADERS: ', requestHeaders,
            'RESP_STATUS:', responseStatusCode, 'RESP_HEADERS:', responseHeaders, 'RESP_INTERVAL:', responseInterval, 'ms RESP_DATA:', responseData, 'RESP_ERROR:', responseError);
    };
}
