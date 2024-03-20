import mockFs from "mock-fs";

import { config_path } from "@common/const/app-config";

const CONFIG_MOCK_CONTENT = `{
    "uc_url": "https://mocked-uc.qiniu.io",
    "regions": [
        {
            "id": "mock-1",
            "label": "Mocked Region",
            "endpoint": "https://mocked-s3.pocdemo.qiniu.io"
        }
    ]
}`;

export function mockCustomizeConfigFile() {
    mockFs({
        [config_path]: {
            "config.json": CONFIG_MOCK_CONTENT,
        },
    });
}

export function resetConfigFile() {
    mockFs.restore();
}
