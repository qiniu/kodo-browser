import * as qiniuPathConvertor from "qiniu-path/dist/src/convert";
import { Path as QiniuPath } from "qiniu-path/dist/src/path";
import { Adapter, Domain, FrozenInfo, ObjectInfo, PartialObjectError, StorageClass, TransferObject } from 'kodo-s3-adapter-sdk/dist/adapter'
import Duration from "@/const/duration";
import * as FileItem from "@/models/file-item";

import { GetAdapterOptionParam, getDefaultClient } from "./common"

// listFiles
interface ListFilesOption extends GetAdapterOptionParam {
    maxKeys?: number,
    minKeys?: number,
}
interface ListFilesResult {
    data: FileItem.Item[],
    marker?: string,
}
export async function listFiles(
    region: string,
    bucket: string,
    key: QiniuPath,
    marker: string | undefined,
    opt: ListFilesOption,
): Promise<ListFilesResult> {
    const items: FileItem.Item[] = [];
    const option = {
        nextContinuationToken: marker,
        delimiter: '/',
        maxKeys: opt.maxKeys || 1000,
        minKeys: opt.minKeys || 1000,
    };
    return await getDefaultClient(opt).enter("listFiles", async client => {
        const listedObjects = await client.listObjects(region, bucket, key.toString(), option);
        if (listedObjects.commonPrefixes) {
            listedObjects.commonPrefixes.forEach((item) => {
                const path = qiniuPathConvertor.fromQiniuPath(item.key);
                items.push({
                    bucket: item.bucket,
                    name: path.directoryBasename() ?? "",
                    path: path,
                    itemType: FileItem.ItemType.Directory,
                });
            });
        }
        if (listedObjects.objects) {
            listedObjects.objects.forEach((item) => {
                if (!key.toString().endsWith('/') || item.key != key.toString()) {
                    const path = qiniuPathConvertor.fromQiniuPath(item.key);
                    items.push({
                        bucket: item.bucket,
                        name: path.basename() ?? "",
                        path: path,
                        itemType: FileItem.ItemType.File,
                        size: item.size,
                        storageClass: item.storageClass,
                        lastModified: item.lastModified,
                        withinFourHours: (new Date().getTime() - item.lastModified.getTime()) <= 4 * Duration.Hour,
                    });
                }
            });
        }
        return {
            data: items,
            marker: listedObjects.nextContinuationToken,
        };
    }, {
        targetBucket: bucket,
        targetKey: key.toString(),
    });
}

export async function createFolder(
    region: string,
    bucket: string,
    prefix: QiniuPath,
    opt: GetAdapterOptionParam,
): Promise<void> {
    const directoryBasename = prefix.directoryBasename();
    if (!directoryBasename) {
        throw new Error("create folder lost directorBasename");
    }
    await getDefaultClient(opt).enter("createFolder", async client => {
        await client.putObject(
            region,
            {
                bucket,
                key: prefix.toString(),
            },
            Buffer.alloc(0),
            directoryBasename,
        );
    }, {
        targetBucket: bucket,
        targetKey: prefix.toString(),
    });
}

export async function checkFileExists(
    region: string,
    bucket: string,
    key: QiniuPath,
    opt: GetAdapterOptionParam,
): Promise<boolean> {
    return await getDefaultClient(opt).enter("checkFileExists", async client => {
        return await client.isExists(
            region,
            {
                bucket,
                key: key.toString(),
            },
        );
    }, {
        targetBucket: bucket,
        targetKey: key.toString(),
    });
}

export async function checkFolderExists(
    region: string,
    bucket: string,
    prefix: QiniuPath,
    opt: GetAdapterOptionParam,
): Promise<boolean> {
    return await getDefaultClient(opt).enter("checkFolderExists", async client => {
        const listObjects = await client.listObjects(
            region,
            bucket,
            prefix.toString(),
            {
                maxKeys: 1,
            },
        );
        return listObjects.objects.length > 0 && listObjects.objects[0].key.startsWith(prefix.toString());
    }, {
        targetBucket: bucket,
        targetKey: prefix.toString(),
    });
}

export async function getFrozenInfo(
    region: string,
    bucket: string,
    key: QiniuPath,
    opt: GetAdapterOptionParam,
): Promise<FrozenInfo> {
    return await getDefaultClient(opt).enter('getFrozenInfo', async client => {
        return await client.getFrozenInfo(region, { bucket: bucket, key: key.toString() })
    }, {
        targetBucket: bucket,
        targetKey: key.toString(),
    });
}

export async function headFile(
    region: string,
    bucket: string,
    key: QiniuPath,
    opt: GetAdapterOptionParam,
): Promise<ObjectInfo> {
    return await getDefaultClient(opt).enter("headFile", async client => {
        return await client.getObjectInfo(
            region,
            {
                bucket,
                key: key.toString(),
            },
        );
    }, {
        targetBucket: bucket,
        targetKey: key.toString(),
    });
}

export async function setStorageClass(
    region: string,
    bucket: string,
    key: QiniuPath,
    storageClass: StorageClass,
    opt: GetAdapterOptionParam,
): Promise<void> {
    await getDefaultClient(opt).enter("setStorageClass", async client => {
        await client.setObjectStorageClass(
            region,
            {
                bucket,
                key: key.toString(),
            },
            storageClass,
        );
    }, {
        targetBucket: bucket,
        targetKey: key.toString(),
    });
}

export async function getContent(
    region: string,
    bucket: string,
    key: QiniuPath,
    domain: Domain,
    opt: GetAdapterOptionParam,
):Promise<Buffer> {
    return await getDefaultClient(opt).enter("getContent", async client => {
        const obj = await client.getObject(
            region,
            {
                bucket,
                key: key.toString(),
            },
            domain,
        );
        return obj.data;
    }, {
        targetBucket: bucket,
        targetKey: key.toString(),
    })
}

export async function saveContent(
    region: string,
    bucket: string,
    key: QiniuPath,
    content: Buffer,
    domain: Domain,
    _getOpt: GetAdapterOptionParam,
    putOpt: GetAdapterOptionParam,
): Promise<void> {
    const basename = key.basename();
    if (!basename) {
        throw new Error("saveContent lost basename");
    }
    await getDefaultClient(putOpt).enter("saveContent", async client => {
        const headers =  await client.getObjectHeader(
            region,
            {
                bucket,
                key: key.toString(),
            },
            domain,
        );
        await client.putObject(
            region,
            {
                bucket,
                key: key.toString(),
            },
            content,
            basename,
            {
                metadata: headers.metadata,
            }
        );
    }, {
        targetBucket: bucket,
        targetKey: key.toString(),
    });
}


export async function moveOrCopyFile(
    region: string,
    bucket: string,
    oldKey: QiniuPath,
    newKey: QiniuPath,
    isCopy: boolean,
    opt: GetAdapterOptionParam,
): Promise<void> {
    const transferObject = {
        from: {
            bucket,
            key: oldKey.toString(),
        },
        to: {
            bucket,
            key: newKey.toString(),
        },
    };

    await getDefaultClient(opt).enter("moveOrCopyFile", async client => {
        if (isCopy) {
            await client.copyObject(region, transferObject);
            return
        }
        await client.moveObject(region, transferObject);
    }, {
        targetBucket: bucket,
        targetKey: oldKey.toString(),
    });
}

export async function restoreFile(
    region: string,
    bucket: string,
    key: QiniuPath,
    days: number,
    opt: GetAdapterOptionParam,
) {
    await getDefaultClient(opt).enter("restoreFile", async client => {
        await client.restoreObject(
            region,
            {
                bucket,
                key: key.toString(),
            },
            days,
        );
    }, {
        targetBucket: bucket,
        targetKey: key.toString(),
    });
}

// batch helper
class ProgressStopController {
    // this should be replaced by AbortController in nodejs >= 14.17.0
    private _stopFlag: boolean = false

    get stopFlag(): boolean {
        return this._stopFlag;
    }

    // after fix fragile batch operations delete this function
    // fragile: every call batch operation will reset this flag
    reset() {
        this._stopFlag = false;
    }

    abort() {
        this._stopFlag = true;
    }
}
type BatchErr = {
    item: FileItem.Item,
    error: any,
}
export class Progress {
    total: number = 0
    current: number = 0
    errorCount: number = 0
    errorItems: BatchErr[] = []

    onProgress?: Function
    onProgressErr: (err: any) => void

    stopController: ProgressStopController

    constructor(
        onProgress: (progress: Progress) => void,
        onProgressErr: (err: any) => void,
        stopController: ProgressStopController = new ProgressStopController(),
    ) {
        this.onProgress = onProgress;
        this.onProgressErr = onProgressErr;
        this.stopController = stopController;
        return this;
    }

    handleProgress() {
        if (this.onProgress) {
            try {
                this.onProgress(this);
            } catch (err) {
                this.onProgressErr(err);
            }
        }
    }

    createCallback(items: FileItem.Item[]) {
        return (index: number, error: any) => {
            if (error) {
                this.errorItems.push({
                    item: items[index],
                    error,
                });
                this.errorCount += 1;
            } else {
                this.current += 1;
            }
            this.handleProgress();
            // callback() === false will stop the progress
            return !this.stopController.stopFlag;
        }
    }
}

type OperateItemsFn<T> = (client: Adapter, files: T[], listedByFolder?: FileItem.Folder) => Promise<PartialObjectError[]>;
class BatchOperator {
    client: Adapter
    region: string
    progress: Progress

    constructor({
        client,
        region,
        progress,
    }: {
        client: Adapter,
        region: string,
        progress: Progress,
    }) {
        this.client = client;
        this.region = region;
        this.progress = progress;
    }

    async run(
        items: FileItem.Item[],
        operateFilesFn: OperateItemsFn<FileItem.File>,
        operationFoldersFn?: OperateItemsFn<FileItem.Folder>,
    ): Promise<PartialObjectError[][]> {
        // all batch promises
        let promises: Promise<PartialObjectError[]>[] = [];

        // folders waiting process
        let folderQueue: FileItem.Folder[] = items.filter(FileItem.isItemFolder);

        // process files
        promises.push(
            this.processItems(items.filter(FileItem.isItemFile), operateFilesFn)
        );

        // process folder
        let folder: FileItem.Folder | undefined;
        let concurrentPromises: Promise<PartialObjectError[]>[] = []
        const maxConcurrence = 3;
        while(folder = folderQueue.shift()) {
            if (this.progress.stopController.stopFlag) {
                break;
            }
            concurrentPromises.push(this.processFolder(folder, operateFilesFn, operationFoldersFn));

            // control max concurrence
            if (concurrentPromises.length >= maxConcurrence) {
                const {
                    resolvedPromise,
                } = await Promise.race(concurrentPromises.map(p => p.then(() => ({ resolvedPromise: p}))));
                concurrentPromises.splice(concurrentPromises.indexOf(resolvedPromise), 1);
                promises.concat(resolvedPromise);
            }
        }

        // waiting concurrent folder process
        return await Promise.all(promises.concat(concurrentPromises));
    }

    async processItems<T>(
        items: T[],
        operateFn: OperateItemsFn<T>,
        listedByFolder?: FileItem.Folder,
    ): Promise<PartialObjectError[]> {
        this.progress.total += items.length;
        this.progress.handleProgress();
        return operateFn(this.client, items, listedByFolder);
    }

    async getItemsInFolder(
        folder: FileItem.Folder,
        marker?: string,
    ): Promise<{ items: FileItem.Item[], nextMark?: string }> {
        const listedObjects = await this.client.listObjects(
            this.region,
            folder.bucket,
            folder.path.toString(),
            {
                nextContinuationToken: marker,
                maxKeys: 1000,
            },
        );
        if (listedObjects?.objects.length <= 0) {
            return {
                items: [],
            };
        }
        return {
            items: listedObjects.objects.map(FileItem.toItemFromObjectInfo),
            nextMark: listedObjects.nextContinuationToken,
        }
    }

    async processFolder(
        folder: FileItem.Folder,
        operationFilesFn: OperateItemsFn<FileItem.File>,
        operationFoldersFn?: OperateItemsFn<FileItem.Folder>,
    ): Promise<PartialObjectError[]> {
        const batchPromises: Promise<PartialObjectError[]>[] = [];

        // init current files
        let batchMark: string | undefined;

        while(true) {
            if (this.progress.stopController.stopFlag) {
                break;
            }
            const getItemsInFolderResult = await this.getItemsInFolder(
                folder,
                batchMark,
            );
            const foldersToOperate = getItemsInFolderResult.items.filter(FileItem.isItemFolder);
            const filesToOperate = getItemsInFolderResult.items.filter(FileItem.isItemFile);
            if (filesToOperate.length > 0) {
                batchPromises.push(
                    this.processItems(filesToOperate, operationFilesFn, folder)
                );
            }
            if (foldersToOperate.length > 0 && operationFoldersFn) {
                batchPromises.push(
                    this.processItems(foldersToOperate, operationFoldersFn, folder)
                );
            }
            batchMark = getItemsInFolderResult.nextMark;
            if (!batchMark) {
                break;
            }
        }
        const result = await Promise.all(batchPromises);
        return result.flat();
    }
}

// batch operations
// set storage class
const stopSetStorageClassOfFilesController = new ProgressStopController();

export async function setStorageClassOfFiles(
    region: string,
    bucket: string,
    items: FileItem.Item[],
    storageClass: StorageClass,
    progressFn: (progress: Progress) => void,
    onError: (err: any) => void,
    opt: GetAdapterOptionParam,
): Promise<BatchErr[]> {
    stopSetStorageClassOfFilesController.reset();

    const progress = new Progress(
        progressFn,
        onError,
        stopSetStorageClassOfFilesController,
    );

    progress.handleProgress();

    return await getDefaultClient(opt).enter("setStorageClassOfFiles", async client => {
        const batchOperator = new BatchOperator({
            client,
            region,
            progress,
        });

        // DISCUSS:
        // const errs = await batchOperator.run(items, _setStorageClassOfFiles);
        // return errs.flat().map(err => ({ item: err }));
        await batchOperator.run(items, _setStorageClassOfFiles);
        return progress.errorItems;
    }, {
        targetBucket: bucket,
    });

    function _setStorageClassOfFiles(client: Adapter, files: FileItem.File[]): Promise<PartialObjectError[]> {
        return client.setObjectsStorageClass(
            region,
            bucket,
            files.map(item => item.path.toString()),
            storageClass,
            progress.createCallback(files),
        );
    }
}

export function stopSetStorageClassOfFiles(): void {
    stopSetStorageClassOfFilesController.abort();
}

// restoreFiles
const stopRestoreFilesController = new ProgressStopController();

export async function restoreFiles(
    region: string,
    bucket: string,
    items: FileItem.Item[],
    days: number,
    progressFn: (progress: Progress) => void,
    onError: (err: any) => void,
    opt: GetAdapterOptionParam,
): Promise<BatchErr[]> {
    stopRestoreFilesController.reset();

    const progress = new Progress(
        progressFn,
        onError,
        stopRestoreFilesController,
    );

    progress.handleProgress();

    return await getDefaultClient(opt).enter("restoreFiles", async client => {
        const batchOperator = new BatchOperator({
            client,
            region,
            progress,
        });

        // DISCUSS:
        // const errs = await batchOperator.run(items, _restoreFiles);
        // return errs.flat().map(err => ({ item: err }));

        await batchOperator.run(items, _restoreFiles);
        return progress.errorItems;
    }, {
        targetBucket: bucket,
    });

    function _restoreFiles(client: Adapter, files: FileItem.File[]): Promise<PartialObjectError[]> {
        return client.restoreObjects(
            region,
            bucket,
            files.map(item => item.path.toString()),
            days,
            progress.createCallback(files),
        );
    }
}

export function stopRestoreFiles(): void {
    stopRestoreFilesController.abort();
}

const stopDeleteFilesController = new ProgressStopController();

export async function deleteFiles(
    region: string,
    bucket: string,
    items: FileItem.Item[],
    progressFn: (progress: Progress) => void,
    onErr: (err: any) => void,
    opt: GetAdapterOptionParam,
): Promise<BatchErr[]> {
    stopSetStorageClassOfFilesController.reset();

    const progress = new Progress(
        progressFn,
        onErr,
        stopSetStorageClassOfFilesController,
    );

    progress.handleProgress();

    return await getDefaultClient(opt).enter("deleteFiles", async client => {
        const batchOperator = new BatchOperator({
            client,
            region,
            progress,
        });

        // DISCUSS:
        // const errs = await batchOperator.run(items, _deleteItems, _deleteItems);
        // return errs.flat().map(err => ({ item: err }));

        await batchOperator.run(items, _deleteItems, _deleteItems);
        return progress.errorItems;
    }, {
        targetBucket: bucket,
    });

    function _deleteItems<T extends FileItem.Item>(client: Adapter, items: T[]): Promise<PartialObjectError[]> {
        return client.deleteObjects(
            region,
            bucket,
            items.map(item => item.path.toString()),
            progress.createCallback(items),
        );
    }
}

export function stopDeleteFiles(): void {
    stopDeleteFilesController.abort();
}

const stopMoveOrCopyFilesController = new ProgressStopController();

export async function moveOrCopyFiles(
    region: string,
    items: FileItem.Item[],
    target: {
        bucket: string,
        key: string,
    },
    progressFn: (progress: Progress) => void,
    onErr: (err: any) => void,
    isCopy: boolean,
    renamePrefix: string,
    opt: GetAdapterOptionParam,
): Promise<BatchErr[]> {
    stopMoveOrCopyFilesController.reset();

    const progress = new Progress(
        progressFn,
        onErr,
        stopMoveOrCopyFilesController,
    );
    progress.handleProgress();

    return await getDefaultClient(opt).enter("moveOrCopyFiles", async client => {
        const batchOperator = new BatchOperator({
            client,
            region,
            progress,
        });

        // DISCUSS:
        // const errs = await batchOperator.run(items, _moveOrCopyItems, _moveOrCopyItems);
        // return errs.flat().map(err => ({ item: err }));

        await batchOperator.run(items, _moveOrCopyItems, _moveOrCopyItems);
        return progress.errorItems;
    }, {
        targetBucket: target.bucket,
    });

    function _moveOrCopyItems<T extends FileItem.Item>(
        client: Adapter,
        foundItems: T[],
        baseFolder?: FileItem.Folder,
    ): Promise<PartialObjectError[]> {
        const transferObjectsOfItems: TransferObject[] = foundItems.map(foundItem => {
            let toPrefix = renamePrefix;
            if (!toPrefix) {
                // target path
                if (target.key) {
                    toPrefix = target.key;
                    if (!target.key.endsWith("/")) {
                        toPrefix += "/";
                    }
                } else {
                    toPrefix = "";
                }

                // be path
                if (baseFolder) {
                    toPrefix +=
                        baseFolder.name + "/"
                        // foundItem relative path of originFolder
                        + foundItem.path.toString().slice(baseFolder.path.toString().length);
                } else {
                    toPrefix += foundItem.name;
                    if(FileItem.isItemFolder(foundItem)) {
                        toPrefix += "/";
                    }
                }
            } else {
                // be path
                if (baseFolder) {
                    toPrefix +=
                        // foundItem relative path of originFolder
                        foundItem.path.toString().slice(baseFolder.path.toString().length);
                } else {
                    toPrefix += foundItem.name;
                    if(FileItem.isItemFolder(foundItem)) {
                        toPrefix += "/";
                    }
                }
            }
            return {
                from: { bucket: foundItem.bucket, key: foundItem.path.toString() },
                to: { bucket: target.bucket, key: toPrefix },
            };
        });
        if (isCopy) {
            return client.copyObjects(region, transferObjectsOfItems, progress.createCallback(foundItems));
        } else {
            return client.moveObjects(region, transferObjectsOfItems, progress.createCallback(foundItems));
        }
    }
}

export function stopMoveOrCopyFiles(): void {
    stopMoveOrCopyFilesController.abort();
}
