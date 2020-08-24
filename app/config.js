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

angular.module("web").factory("Config", ["$translate", "$timeout", "$q", "AuthInfo", "Const", "Toast",
    ($translate, $timeout, $q, AuthInfo, Const, Toast) => {
        class ConfigError extends Error { }
        class ConfigParseError extends Error { }

        const fs = require('fs'),
              path = require('path'),
              each = require('array-each'),
              T = $translate.instant,
              defaultUcUrl = "https://uc.qbox.me",
              defaultRegions = Const.regions,
              configFilePath = path.join(Global.config_path, 'config.json');

        return {
            getUcURL: getUcURL,
            load: loadConfig,
            save: saveConfig,
            exists: configFileExists,
        };

        function getUcURL() {
            return loadConfig().ucUrl;
        }

        function loadConfig(loadDefault) {
            let ucUrl = defaultUcUrl,
                regions = defaultRegions;

            if (loadDefault === undefined) {
                loadDefault = AuthInfo.usePublicCloud();
            }

            if (!loadDefault) {
                try {
                    if (fs.existsSync(configFilePath)) {
                        let config = null;

                        try {
                            config = JSON.parse(fs.readFileSync(configFilePath));
                        } catch (e) {
                            throw new ConfigParseError(e.message);
                        }
                        if (config.uc_url) {
                            ucUrl = config.uc_url;
                        } else {
                            throw new ConfigError("uc_url is missing or empty");
                        }
                        if (config.regions && config.regions.length) {
                            each(config.regions, (region) => {
                                if (!region.id) {
                                    throw new ConfigError('id is missing or empty in region');
                                }
                                if (!region.endpoint) {
                                    throw new ConfigError('endpoint is missing or empty in region');
                                }
                            });
                            regions = config.regions;
                        } else {
                            regions = null;
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

            return { ucUrl: ucUrl, regions: regions };
        }

        function saveConfig(ucUrl, regions) {
            if (!ucUrl) {
                throw new ConfigError('ucUrl is missing or empty');
            }

            const newConfig = { uc_url: ucUrl };

            if (regions && regions.length) {
                each(regions, (region) => {
                    if (!region.id) {
                        throw new ConfigError('id is missing or empty in region');
                    }
                    if (!region.endpoint) {
                        throw new ConfigError('endpoint is missing or empty in region');
                    }
                });
                newConfig.regions = regions;
            }

            fs.writeFileSync(configFilePath, JSON.stringify(newConfig, null, 4), { mode: 0o600 });
        }

        function configFileExists() {
            return fs.existsSync(configFilePath);
        }
    }
]);
