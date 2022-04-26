import fs from "fs"
import path from 'path'

import { Region } from "kodo-s3-adapter-sdk";

import * as AppConfig from "@common/const/app-config";
import * as AuthInfo from '@/components/services/authinfo'

interface ConfigInner {
    uc_url?: string,
    regions?: {
        id: string,
        label?: string,
        endpoint: string,
    }[],
}

interface ConfigPublic {
    [ x: string ]: never,
}

interface ConfigCustomize {
    ucUrl: string,
    regions: Region[],
}

type Config = ConfigPublic | ConfigCustomize;

export function isConfigCustomize(config: Config): config is ConfigCustomize {
    return ("ucUrl" in config);
}

const configFilePath = path.join(AppConfig.config_path, 'config.json');
let cachedConfig: ConfigInner;

export class ConfigError extends Error { }
export class ConfigParseError extends Error { }

export function save(ucUrl: string, regions: Region[]) {
    if (!ucUrl) {
        throw new ConfigError('ucUrl is missing or empty');
    }

    const newConfig: ConfigInner = { uc_url: ucUrl };

    if (regions && regions.length > 0) {
        newConfig.regions = regions.map((region) => {
            if (!region.s3Id) {
                throw new ConfigError('id is missing or empty in region');
            }
            if (!region.s3Urls || region.s3Urls.length === 0) {
                throw new ConfigError('endpoint is missing or empty in region');
            }
            return { id: region.s3Id, label: region.label, endpoint: region.s3Urls[0] };
        });
    }
    cachedConfig = newConfig;
    fs.writeFileSync(configFilePath, JSON.stringify(newConfig, null, 4), { mode: 0o600 });
}

export function load(isUsingPublic?: boolean): Config {
    let result: Config = {};
    if (
        (isUsingPublic ?? AuthInfo.usePublicCloud()) ||
        !fs.existsSync(configFilePath)
    ) {
        return result;
    }

    // load customize config
    if (!cachedConfig) {
        try {
            cachedConfig = JSON.parse(fs.readFileSync(configFilePath).toString())
        } catch (e: any) {
            throw new ConfigParseError(e.message)
        }
    }
    // check data from json file
    const ucUrl = cachedConfig.uc_url;
    if (!ucUrl) {
        throw new ConfigError('uc_url is missing or empty')
    }
    if (cachedConfig.regions?.length) {
        cachedConfig.regions.forEach((region) => {
            if (!region.id) {
                throw new ConfigError('id is missing or empty in region')
            }
            if (!region.endpoint) {
                throw new ConfigError('endpoint is missing or empty in region')
            }
        });
    }

    result = {
        ucUrl,
        regions: (cachedConfig.regions ?? []).map<Region>(r => {
            const region = new Region('', r.id, r.label);
            region.ucUrls = [ucUrl];
            region.s3Urls = [r.endpoint];
            return region;
        }),
    }
    return result;
}

export function exists(): boolean {
    return fs.existsSync(configFilePath);
}
