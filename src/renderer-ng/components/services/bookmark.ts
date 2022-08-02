import fs from 'fs'
import path from 'path'

import moment from 'moment'

import * as AppConfig from '@common/const/app-config'
import * as KodoNav from '@/const/kodo-nav'
import * as AuthInfo from './authinfo'

class Bookmark {
    fullPath: string
    mode: KodoNav.Mode
    timestamp: number

    constructor(fullPath: string, mode: KodoNav.Mode, timestamp: number = moment().unix()) {
        this.fullPath = fullPath;
        this.mode = mode;
        this.timestamp = timestamp;
    }

    isBucketsOrFiles() {
        return this.mode.startsWith('local');
    }

    isExternalPathBookmark() {
        return this.mode.startsWith('external');
    }
}

function getFilePath(): string {
    const folder = AppConfig.config_path;

    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }

    const username = AuthInfo.get().id || 'kodo-browser';
    return path.join(folder, `bookmarks_${username}.json`);
}

function writeBookmarks(bookmarks: Bookmark[]) {
    fs.writeFileSync(getFilePath(), JSON.stringify({bookmarks: bookmarks}));
}

export function list(): Bookmark[] {
    const filePath = getFilePath();
    try {
        fs.accessSync(filePath, fs.constants.R_OK);
    } catch (err) {
        return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    let bookmarks: Bookmark[] = JSON.parse(data).bookmarks || [];

    return bookmarks.map((bookmark) => {
        return new Bookmark(bookmark.fullPath, bookmark.mode, bookmark.timestamp);
    });
}

export function add(fullPath: string, mode: KodoNav.Mode): void {
    const bookmarks = list();
    let found = false;
    for (let i = 0; i < bookmarks.length; i++) {
        if (bookmarks[i].fullPath === fullPath &&
            bookmarks[i].mode === mode) {
            bookmarks[i].timestamp = moment().unix();
            found = true;
            break;
        }
    }
    if (!found) {
        bookmarks.push(new Bookmark(fullPath, mode));
    }
    writeBookmarks(bookmarks);
}

export function marked(fullPath: string, mode: KodoNav.Mode): boolean {
    const bookmarks = list();
    return bookmarks.some(bookmark => (
        bookmark.fullPath === fullPath &&
        bookmark.mode === mode
    ));
}

export function remove(fullPath: string, mode: KodoNav.Mode): void {
    const bookmarks = list();
    const removeIndex = bookmarks.findIndex(bookmark => (
        bookmark.fullPath === fullPath &&
        bookmark.mode === mode
    ));
    if (removeIndex >= 0) {
        bookmarks.splice(removeIndex, 1);
    }
    writeBookmarks(bookmarks);
}
