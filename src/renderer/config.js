import { Region } from 'kodo-s3-adapter-sdk'

import fs from 'fs'
import path from 'path'
/*
 * {
 *   "regions": [{
 *      id: "regionA",
 *      label: "区域 A", // Optional
 *      endpoint: "https://s3-region-1.localhost.com"
 *   }],
 *   "uc_url": "https://uc.qbox.me"
 * }
 */
import webModule from './app-module/web'

import AuthInfo from "./components/services/authinfo"

import { TOAST_FACTORY_NAME as Toast } from './components/directives/toast-list'

const CONFIG_FACTORY_NAME = 'Config'

webModule.factory(CONFIG_FACTORY_NAME, ["$translate", "$timeout", "$q", AuthInfo, Toast,
    ($translate, $timeout, $q, AuthInfo, Toast) => {
        class ConfigError extends Error { }
        class ConfigParseError extends Error { }

        const T = $translate.instant,
          configFilePath = path.join(Global.config_path, 'config.json');
        let configCache = undefined;

        return {
            load: load,
            save: save,
            exists: exists,
        };

        function load(loadDefault) {
            const result = {};

            if (loadDefault === undefined || loadDefault === null) {
                loadDefault = AuthInfo.usePublicCloud();
            }

            if (!loadDefault) {
                try {
                    if (fs.existsSync(configFilePath)) {
                        let config = null;

                        if (configCache) {
                            config = configCache;
                        } else {
                            try {
                                config = JSON.parse(fs.readFileSync(configFilePath));
                                configCache = config;
                            } catch (e) {
                                throw new ConfigParseError(e.message);
                            }
                        }
                        if (config.uc_url) {
                            result.ucUrl = config.uc_url;
                        } else {
                            throw new ConfigError("uc_url is missing or empty");
                        }
                        if (config.regions && config.regions.length) {
                            config.regions.forEach((region) => {
                                if (!region.id) {
                                    throw new ConfigError('id is missing or empty in region');
                                }
                                if (!region.endpoint) {
                                    throw new ConfigError('endpoint is missing or empty in region');
                                }
                            });
                            result.regions = config.regions.map((r) => {
                                const region = new Region('', r.id, r.label);
                                region.ucUrls = [config.uc_url];
                                region.s3Urls = [r.endpoint];
                                return region;
                            });
                        }
                    }
                } catch (e) {
                    if (e instanceof ConfigParseError) {
                        Toast.error(T('config.parse.error'));
                    } else if (e instanceof ConfigError) {
                        Toast.error(T('config.format.error'));
                    }
                    throw e;
                }
            }

            return result;
        }

        function save(ucUrl, regions) {
            if (!ucUrl) {
                throw new ConfigError('ucUrl is missing or empty');
            }

            const newConfig = { uc_url: ucUrl };

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
            configCache = newConfig;
            fs.writeFileSync(configFilePath, JSON.stringify(newConfig, null, 4), { mode: 0o600 });
        }

        function exists() {
            return fs.existsSync(configFilePath);
        }
    }
]);

export default CONFIG_FACTORY_NAME