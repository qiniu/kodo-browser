import fs from "fs"
import path from "path"

import * as AppConfig from "@common/const/app-config";

class AkHistory {
    isPublicCloud: boolean
    accessKeyId: string
    accessKeySecret: string
    description: string

    constructor(
        isPublicCloud: boolean,
        accessKeyId: string,
        accessKeySecret: string,
        description: string,
    ) {
        this.isPublicCloud = isPublicCloud;
        this.accessKeyId = accessKeyId;
        this.accessKeySecret = accessKeySecret;
        this.description = description;
    }
}

function getFilePath(): string {
    const folder = AppConfig.config_path;

    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }

    return path.join(folder, 'ak_histories.json');
}

function writeHistories(histories: AkHistory[]): void {
    fs.writeFileSync(getFilePath(), JSON.stringify({historyItems: histories}));
}

export function list(): AkHistory[] {
    const filePath = getFilePath();
    try {
        fs.accessSync(filePath, fs.constants.R_OK);
    } catch (err) {
        return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data).historyItems || [];
}

export function add(
    isPublicCloud: boolean,
    accessKeyId: string,
    accessKeySecret: string,
    description: string,
):void {
    const histories = list();
    let found = false;
    for (let i = 0; i < histories.length; i++) {
        if (histories[i].accessKeyId === accessKeyId) {
            histories[i].isPublicCloud = isPublicCloud;
            histories[i].accessKeySecret = accessKeySecret;
            histories[i].description = description;
            found = true;
            break;
        }
    }
    if (!found) {
        histories.push(new AkHistory(isPublicCloud, accessKeyId, accessKeySecret, description));
    }
    writeHistories(histories);
}

export function remove(accessKeyId: string): void {
    const histories = list();
    for (let i = 0; i < histories.length; i++) {
        if (histories[i].accessKeyId === accessKeyId) {
            histories.splice(i, 1);
            break;
        }
    }
    writeHistories(histories);
}

export function clearAll(): void {
    writeHistories([]);
}
