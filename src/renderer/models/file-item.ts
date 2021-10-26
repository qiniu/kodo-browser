import { Path as QiniuPath } from "qiniu-path/dist/src/path";
import { ObjectInfo } from "kodo-s3-adapter-sdk/dist/adapter";
import * as qiniuPathConvertor from "qiniu-path/dist/src/convert";
import Duration from "@/const/duration";

export enum ItemType {
    Directory = "folder",
    File = "file",
}
export interface ItemBase {
    bucket: string,
    name: string,
    path: QiniuPath,
    itemType: ItemType,
}
export interface File extends ItemBase {
    itemType: ItemType.File,
    size: number,
    storageClass: string,
    lastModified: Date,
    withinFourHours: boolean,
}
export interface Folder extends ItemBase {
    itemType: ItemType.Directory,
}

export type Item  = File | Folder;

export function isItemFile(item: Item): item is File {
    return item.itemType === ItemType.File;
}

export function isItemFolder(item: Item): item is Folder {
    return item.itemType === ItemType.Directory;
}

export function toItemFromObjectInfo(obj: ObjectInfo): Item {
    const itemPath = qiniuPathConvertor.fromQiniuPath(obj.key);
    const isDir = obj.key.endsWith("/");
    const itemBase: ItemBase = {
        bucket: obj.bucket,
        name: (
            isDir
                ? itemPath.directoryBasename()
                : itemPath.basename()
        ) ?? '',
        path: itemPath,
        itemType: isDir
            ? ItemType.Directory
            : ItemType.File,
    };
    switch (itemBase.itemType) {
        case ItemType.File:
            return {
                ...itemBase,
                itemType: ItemType.File,
                size: obj.size,
                storageClass: obj.storageClass,
                lastModified: obj.lastModified,
                withinFourHours: (new Date().getTime() - obj.lastModified.getTime()) <= 4 * Duration.Hour,
            };
        case ItemType.Directory:
            return {
                ...itemBase,
                itemType: ItemType.Directory,
            };
        default:
            throw new Error(`transObjectInfoToItem Error unknown itemType=${itemBase.itemType}`);
    }
}
