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

import * as Config from "./config"

import { TOAST_FACTORY_NAME as Toast } from './components/directives/toast-list'

const NG_CONFIG_FACTORY_NAME = 'Config'

webModule.factory(NG_CONFIG_FACTORY_NAME, ["$translate", Toast,
    ($translate, Toast) => {

        const T = $translate.instant;

        return {
            load: load,
            save: Config.save,
            exists: Config.exists,
        };

        function load(loadDefault) {
            try {
                return Config.load(loadDefault);
            } catch (e) {
                if (e instanceof Config.ConfigParseError) {
                    Toast.error(T('config.parse.error'));
                } else if (e instanceof Config.ConfigError) {
                    Toast.error(T('config.format.error'));
                }
                throw e;
            }
        }
    }
]);

export default NG_CONFIG_FACTORY_NAME
