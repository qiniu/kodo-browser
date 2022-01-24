import { Bucket } from "kodo-s3-adapter-sdk/dist/adapter";

import { GetAdapterOptionParam, getDefaultClient } from "./common"

export async function listAllBuckets(opt: GetAdapterOptionParam): Promise<Bucket[]> {
    return await getDefaultClient(opt).enter("listBuckets", async client => {
        return await client.listBuckets();
    });
}

export async function createBucket(region: string, bucket: string, opt: GetAdapterOptionParam): Promise<void> {
    await getDefaultClient(opt).enter("createBucket", async client => {
        await client.createBucket(region, bucket);
    }, {
        targetBucket: bucket,
    });
}

export async function deleteBucket(region: string, bucket: string, opt: GetAdapterOptionParam): Promise<void> {
    await getDefaultClient(opt).enter("deleteBucket", async client => {
        await client.deleteBucket(region, bucket);
    }, {
        targetBucket: bucket,
    });
}
