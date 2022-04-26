import path from 'path';
import os from 'os';

import pkgJson from '../../../package.json';

export const app = {
    id: 'kodo-browser',
    logo: 'icons/icon.png',
    version: pkgJson.version,
};

export const config_path = path.join(os.homedir(), '.kodo-browser');
