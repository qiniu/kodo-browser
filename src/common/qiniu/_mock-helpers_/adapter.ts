import { ListedObjects, ObjectInfo } from "kodo-s3-adapter-sdk/dist/adapter";

export function mockAdapterFactory(adapterName: string) {
    const mockedClient = jest.fn();
    mockedClient.constructor = mockedClient;
    mockedClient.prototype.enter = async function (_: string, fn: Function) {
        return await fn(this);
    }
    mockedClient.prototype.enter = jest.fn(mockedClient.prototype.enter);

    // bucket
    mockedClient.prototype.listBuckets = jest.fn();
    mockedClient.prototype.createBucket = jest.fn();
    mockedClient.prototype.deleteBucket = jest.fn();
    mockedClient.prototype.updateBucketRemark = jest.fn();

    // utils
    mockedClient.prototype.listDomains = jest.fn();
    mockedClient.prototype.getObjectURL = jest.fn();

    // files
    // set
    mockedClient.prototype.putObject = jest.fn();
    mockedClient.prototype.setObjectStorageClass = jest.fn();
    mockedClient.prototype.restoreObject = jest.fn();

    // get
    mockedClient.prototype.listObjects = jest.fn();
    // template to mock listObjects
    // MockedKodoAdapter.prototype.listObjects.mockImplementationOnce(async (
    //     _domain: string,
    //     _region: string,
    //     _key: string,
    //     option?: ListObjectsOption
    // ): Promise<ListedObjects> => {
    //     // other normal query
    //     if (option?.delimiter) {
    //         return MockAdapter.delimiterStyleTestData;
    //     }
    //     return MockAdapter.flatStyleTestData;
    // });
    mockedClient.prototype.isExists = jest.fn(async (_: string, data: { bucket: string, key: string }) => {
        return data.key === "qiniu-client/isExists/true"
    });
    mockedClient.prototype.getObject = jest.fn();
    mockedClient.prototype.getObjectInfo = jest.fn();
    mockedClient.prototype.getObjectHeader = jest.fn();
    mockedClient.prototype.getFrozenInfo = jest.fn();

    // move or copy
    mockedClient.prototype.copyObject = jest.fn();
    mockedClient.prototype.moveObject = jest.fn();


    // batch operations
    mockedClient.prototype.setObjectsStorageClass = jest.fn();
    mockedClient.prototype.copyObjects = jest.fn();
    mockedClient.prototype.moveObjects = jest.fn();
    mockedClient.prototype.restoreObjects = jest.fn();
    mockedClient.prototype.deleteObjects = jest.fn();

    return {
        __esModule: true,
        [adapterName]: mockedClient,
    };
}

export const flatStyleTestData: ListedObjects = {
    objects: [
        {
            bucket: "kodo-browser-dev",
            key: "qiniu-client/dir-1/",
            lastModified: new Date("2021-11-25T05:39:00.682Z"),
            size: 0,
            storageClass: "Standard",
        },
        {
            bucket: "kodo-browser-dev",
            key: "qiniu-client/dir-2/",
            lastModified: new Date("2021-11-25T05:40:00.682Z"),
            size: 0,
            storageClass: "Standard",
        },
        {
            bucket: "kodo-browser-dev",
            key: "qiniu-client/dir-3/",
            lastModified: new Date("2021-11-25T05:39:00.682Z"),
            size: 0,
            storageClass: "Standard",
        },
        {
            bucket: "kodo-browser-dev",
            key: "qiniu-client/dir-4/",
            lastModified: new Date("2021-11-25T05:23:00.682Z"),
            size: 0,
            storageClass: "Standard",
        },
        {
            bucket: "kodo-browser-dev",
            key: "qiniu-client/file-1",
            lastModified: new Date("2021-11-25T05:43:00.682Z"),
            size: 1235,
            storageClass: "Standard",
        },
        {
            bucket: "kodo-browser-dev",
            key: "qiniu-client/file-2",
            lastModified: new Date("2021-11-25T05:39:00.682Z"),
            size: 5432,
            storageClass: "Standard",
        },
        {
            bucket: "kodo-browser-dev",
            key: "qiniu-client/file-3",
            lastModified: new Date("2021-11-25T05:55:00.682Z"),
            size: 73624,
            storageClass: "Standard",
        },
        {
            bucket: "kodo-browser-dev",
            key: "qiniu-client/file-4",
            lastModified: new Date("2021-11-25T05:34:00.682Z"),
            size: 154367,
            storageClass: "Standard",
        },
    ],
};

export const delimiterStyleTestData = {
    commonPrefixes: flatStyleTestData.objects
        .filter(i => i.key.endsWith("/"))
        .map(i => ({
            bucket: i.bucket,
            key: i.key,
        })),
    objects: flatStyleTestData.objects
        .filter(i => !i.key.endsWith("/"))
        // copy
        .map(i => ({
            ...i
        })),
}

function* idGen(i: number = 0): IterableIterator<number> {
    while (true) {
        yield i += 1;
    }
}

function* itemGen({
    maxPageNum,
    subDirNum = 1,
    subDirFileNumRange = [5, 10],
    pageSize = 10,
    startPageNum = 0,
}: {
    maxPageNum: number,
    subDirNum?: number,
    subDirFileNumRange?: [number, number],
    pageSize?: number,
    startPageNum?: number,
}): IterableIterator<ListedObjects> {
    const [subDirFileNumFloor, subDirFileNumCiel] = subDirFileNumRange;
    // not `<=` is because directory take up a place
    // -1 is for first page to return dir self
    if (subDirFileNumCiel < pageSize - 1) {
        throw Error(`can't set subDirFileNumRange: ${subDirFileNumRange} greater than pageSize: ${[0, pageSize]}`)
    }
    const fileIdGen = idGen();
    let currList: ObjectInfo[] = [{
        bucket: "kodo-browser-dev",
        key: `qiniu-client/`,
        lastModified: new Date("2021-11-25T05:39:00.682Z"),
        size: 0,
        storageClass: "Standard",
    }];
    while (startPageNum < maxPageNum) {
        if (subDirNum) {
            const subDirFileIdGen = idGen();
            const currSubDirItemNum = subDirFileNumFloor;
                // + Math.floor(Math.random() * (subDirFileNumCiel - subDirFileNumFloor));
            currList.push({
                bucket: "kodo-browser-dev",
                key: `qiniu-client/sub-dir-${subDirNum}/`,
                lastModified: new Date("2021-11-25T05:39:00.682Z"),
                size: 0,
                storageClass: "Standard",
            })
            while (currList.length < currSubDirItemNum) {
                currList.push({
                    bucket: "kodo-browser-dev",
                    key: `qiniu-client/sub-dir-${subDirNum}/file-${subDirFileIdGen.next().value}`,
                    lastModified: new Date("2021-11-25T05:39:00.682Z"),
                    size: 0,
                    storageClass: "Standard",
                });
            }
            subDirNum -= 1;
        }
        while (currList.length < pageSize) {
            currList.push({
                bucket: "kodo-browser-dev",
                key: `qiniu-client/file-${fileIdGen.next().value}`,
                lastModified: new Date("2021-11-25T05:39:00.682Z"),
                size: 0,
                storageClass: "Standard",
            });
        }
        yield {
            objects: currList,
            nextContinuationToken: (startPageNum += 1).toString(),
        }
        currList = [];
    }
}

export class MockDataOfBatchOperation {

    readonly subDirNum: number
    readonly pageNum: number
    readonly pageSize: number
    private _items: ObjectInfo[]
    private itemIterator: IterableIterator<ListedObjects>

    constructor(pageNum: number = 3, pageSize: number = 10, subDirNum: number = 1) {
        this.subDirNum = subDirNum;
        this.pageNum = pageNum;
        this.pageSize = pageSize;
        this._items = this.initObjects.filter(i => !i.key.endsWith("/"));
        this.itemIterator = itemGen({
            maxPageNum: pageNum,
            subDirNum,
            pageSize,
        });
    }


    // mock selected data
    get initObjects(): ObjectInfo[] {
        const fileIdGen = idGen();
        return [
            {
                bucket: "kodo-browser-dev",
                key: `qiniu-client/`,
                lastModified: new Date("2021-11-25T05:39:00.682Z"),
                size: 0,
                storageClass: "Standard",
            },
            {
                bucket: "kodo-browser-dev",
                key: `qiniu-client/file-${fileIdGen.next().value}`,
                lastModified: new Date("2021-11-25T05:39:00.682Z"),
                size: 0,
                storageClass: "Standard",
            },
            {
                bucket: "kodo-browser-dev",
                key: `qiniu-client/file-${fileIdGen.next().value}`,
                lastModified: new Date("2021-11-25T05:39:00.682Z"),
                size: 0,
                storageClass: "Standard",
            },
            {
                bucket: "kodo-browser-dev",
                key: `qiniu-client/file-${fileIdGen.next().value}`,
                lastModified: new Date("2021-11-25T05:39:00.682Z"),
                size: 0,
                storageClass: "Standard",
            },
        ]
    }

    // mock sub files in initObjects(selected data) `qiniu-client/`
    get listedObjects(): ListedObjects {
        const { value, done } = this.itemIterator.next();
        if (done) {
            return {
                objects: [],
            }
        }
        this._items = this._items.concat(value.objects);
        return value;
    }

    get items(): ObjectInfo[] {
        return this._items;
    }
}
