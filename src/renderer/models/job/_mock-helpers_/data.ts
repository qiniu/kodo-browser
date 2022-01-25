export const uploadOptionsFromNewJob = {
    "clientOptions": {
        "accessKey": "NgKd0BmebvsFERFEBfKVVZGeGn7VsZQe_H_AunOC",
        "secretKey": "lp4Zv3Gi_7CHtxNTcJx2Pum5hUJB3gHROcg4vp0i",
        ucUrl: "",
        "regions": []
    },
    // ↑ manual add ↓ from file
    storageClasses: [], // break change from 1.0.17, older task will be uploaded with standard storage class
    "region": "cn-east-1",
    "to": {
        "bucket": "kodo-browser-dev",
        "key": "remote/path/to/out.gif"
    },
    "from": {
        "name": "out.gif",
        "path": "/local/path/to/out.gif"
    },
    "overwrite": false,
    storageClassName: "Standard" as const,
    backendMode: "kodo" as const,
    "resumeUpload": false,
    "multipartUploadSize": 16,
    "multipartUploadThreshold": 100,
    uploadSpeedLimit: 0, // break change from 1.0.16, 0 means no limit
    "isDebug": false,

    userNatureLanguage: 'zh-CN' as const, // break change from 1.0.16
}

export const uploadOptionsFromResumeJob = {
    "clientOptions": {
        "accessKey": "NgKd0BmebvsFERFEBfKVVZGeGn7VsZQe_H_AunOC",
        "secretKey": "lp4Zv3Gi_7CHtxNTcJx2Pum5hUJB3gHROcg4vp0i",
        ucUrl: "", // break change from 1.0.16, "" means public
        "regions": []
    },
    // ↑ manual add ↓ from file
    "region": "cn-east-1",
    "to": {
        "bucket": "kodo-browser-dev",
        "key": "remote/path/to/out.mp4"
    },
    "from": {
        "name": "out.mp4",
        "path": "/local/path/to/out.mp4",
        "size": 135515599,
        "mtime": 1607594980239.0781
    },
    "prog": {
        "total": 135515599,
        "loaded": 17825792,
        "resumable": false
    },
    "status": "stopped",
    "message": "",
    "uploadedId": "61a5f55fda9ed605fd263bc2region02z0",
    "uploadedParts": [
        {
            "partNumber": 1,
            "etag": "lhBVs6yZLGUrM4XMCVts4yylKd-d"
        },
        {
            "partNumber": 2,
            "etag": "lkYHX1O5MuEHazAy7TWuFTdriBP4"
        },
        {
            "partNumber": 3,
            "etag": "lmsVRxCUz954oLhp_X3pQh8up9J1"
        }
    ],
    "overwrite": false,
    "storageClassName": "Standard",
    "backendMode": "kodo",
    "resumeUpload": false,
    "multipartUploadSize": 16,
    "multipartUploadThreshold": 100,
    "uploadSpeedLimit": false,
    "isDebug": false,

    userNatureLanguage: 'zh-CN' as const, // break change from 1.0.16
}

export const downloadOptionsFromResumeJob = {
    "clientOptions": {
        "accessKey": "NgKd0BmebvsFERFEBfKVVZGeGn7VsZQe_H_AunOC",
        "secretKey": "lp4Zv3Gi_7CHtxNTcJx2Pum5hUJB3gHROcg4vp0i",
        ucUrl: "", // break change from 1.0.16, "" means public
        "regions": []
    },
    // ↑ manual add ↓ from file
    "region": "cn-east-1",
    "to": {
        "name": "out.mp4",
        "path": "/local/path/to/out.mp4"
    },
    "from": {
        "bucket": "kodo-browser-dev",
        "key": "remote/path/to/out.mp4",
        "size": 135515599,
        mtime: 1635403263903,
    },
    "prog": {
        loaded: 25177695,
        "total": 135515599,
        "resumable": true
    },
    "backendMode": "s3" as const, // break change from 1.0.16, must as const
    "message": "",

    userNatureLanguage: 'zh-CN' as const, // break change from 1.0.16
}
