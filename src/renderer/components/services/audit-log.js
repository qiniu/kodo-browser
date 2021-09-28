import fs from 'fs'
import path from 'path'

import moment from 'moment'

import webModule from '@/app-module/web'

import AuthInfo from './authinfo'

const AUDIT_LOG_FACTORY_NAME = 'AuditLog'

webModule.factory(AUDIT_LOG_FACTORY_NAME, [
    AuthInfo,
    function(AuthInfo) {
        const expirationMonths = 3;

        return {
            log: log,
        }

        function log(action, params, options) {
            options = options || {};
            fs.appendFileSync(getFilePath(), JSON.stringify({
                time: new Date(),
                appVersion: Global.app.version,
                logVersion: options.logVersion || 1,
                accessKeyId: AuthInfo.get().id,
                action: action,
                params: params || {},
            }) + "\n");
        }

        function getFilePath() {
            const folderPath = path.join(Global.config_path, 'logs');
            const logFilePath = path.join(folderPath, `audit_log_${moment().format('YYYY-MM')}.json`);

            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }
            if (!fs.existsSync(logFilePath)) {
                cleanLogs();
            }

            return logFilePath;
        }

        function cleanLogs() {
            const folderPath = path.join(Global.config_path, 'logs');
            const now = moment();
            let entries = fs.readdirSync(folderPath, { withFileTypes: true });

            entries = entries.filter((entry) => {
                return entry.isFile() && entry.name.startsWith('audit_log_');
            });
            entries.forEach((entry) => {
                const momentRegexp = /^audit_log_(\d{4}\-\d{2})\.json$/;
                const matchResult = entry.name.match(momentRegexp);
                if (matchResult) {
                    if (now.diff(moment(matchResult[1], 'YYYY-MM')) > expirationMonths) {
                        fs.unlinkSync(path.join(folderPath, entry.name));
                    }
                }
            });
        }
    }
]);

export default AUDIT_LOG_FACTORY_NAME
