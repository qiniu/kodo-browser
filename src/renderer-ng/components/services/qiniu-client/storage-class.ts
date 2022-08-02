import { S3_MODE } from "kodo-s3-adapter-sdk";
import StorageClass from "@common/models/storage-class";

import { getRegionsStorageClasses } from './regions';
import { GetAdapterOptionParam } from "./common";

const regionsStorageClasses = new Map<string, StorageClass[]>();

function hyphenLangFields(i18n: Record<string, string>) {
    for (const lang in i18n) {
        i18n[lang.replace("_", "-")] = i18n[lang]
        delete i18n[lang]
    }
}

export async function fetchFromRemote(opt: GetAdapterOptionParam): Promise<void> {
    const regionWithStorageClasses = await getRegionsStorageClasses(opt);
    regionWithStorageClasses.forEach(item => {
        const storageClasses = item.storageClasses.map(storageClass => {
            hyphenLangFields(storageClass.nameI18n);
            hyphenLangFields(storageClass.billingI18n);
            return storageClass;
        })
        regionsStorageClasses.set(item.regionS3Id, storageClasses);
    });
}

export function getAvailable(regionId: string, backendMode?: string): StorageClass[] {
    const regionStorageClasses = regionsStorageClasses.get(regionId);
    if (!regionStorageClasses) {
        return [];
    }
    if (backendMode) {
        return regionStorageClasses
            .filter(item => backendMode === S3_MODE ? item.s3Name : item.kodoName);
    }
    return regionStorageClasses;
}
