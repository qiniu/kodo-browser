import { ipcRenderer } from 'electron';

import * as AuthInfo from './authinfo'
import * as QiniuClient from './qiniu-client'

interface loginOptions {
    id: string,
    secret: string,
    isPublicCloud: boolean,
}
export async function login(data: loginOptions): Promise<void> {
    await QiniuClient.listAllBuckets(data);
    AuthInfo.save({
        ...data,
        isAuthed: true,
    });
}

export function logout(): void {
    QiniuClient.clearAllCache();
    AuthInfo.remove();
    ipcRenderer.send('asynchronous', { key: 'clearCache' });
    ipcRenderer.send('asynchronous-job', { key: 'job-stopall' });
}
