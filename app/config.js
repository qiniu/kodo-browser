/*
 * {
 *   "regions": [{
 *      id: "regionA",
 *      label: "区域 A",
 *      endpoint: "https://s3-region-1.localhost.com",
 *      storageClasses: [
 *        { value: "Standard", name: "标准类型" },
 *        { value: "IA", name: "低频访问类型" }
 *      ]
 *   }]
 * }
 */

angular.module("web").factory("Config", ["$translate", "Const", "Toast",
    ($translate, Const, Toast) => {
        class ConfigError extends Error { }
        class ConfigParseError extends Error { }

        const fs = require('fs'),
              path = require('path'),
              each = require('array-each');
        const T = $translate.instant;
        let regions = Const.regions;

        try {
            let configFilePath = path.join(Global.config_path, 'config.json');
            if (fs.existsSync(configFilePath)) {
                let config = null;
                try {
                    config = JSON.parse(fs.readFileSync(configFilePath));
                } catch (e) {
                    throw new ConfigParseError(e.message);
                }
                if (config.regions) {
                    each(config.regions, (region) => {
                        if (!region.id) {
                            throw new ConfigError('id is missing or empty in region');
                        }
                        if (!region.label) {
                            throw new ConfigError('label is missing or empty in region');
                        }
                        if (!region.endpoint) {
                            throw new ConfigError('endpoint is missing or empty in region');
                        }
                        if (!region.storageClasses) {
                            throw new ConfigError('storageClasses is missing or empty in region');
                        } else {
                            each(region.storageClasses, (storageClass) => {
                                if (!storageClass.name) {
                                    throw new ConfigError('name is missing or empty in storageClass');
                                }
                                if (!storageClass.value) {
                                    throw new ConfigError('value is missing or empty in storageClass');
                                }
                            });
                        }
                    });
                    regions = config.regions;
                }
            }
        } catch (e) {
            if (e instanceof ConfigParseError) {
                Toast.error(T('config.parse.error'));
                console.error(e);
            } else if (e instanceof ConfigError) {
                Toast.error(T('config.format.error'));
                console.error(e);
            } else {
                throw e;
            }
        }

        return {
            regions: regions
        };
    }
]);
