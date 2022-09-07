import {Region} from "kodo-s3-adapter-sdk";

import {GetAdapterOptionParam, getDefaultClient, getRegionService} from "./common";

export async function getRegions(
    opt: GetAdapterOptionParam,
): Promise<Region[]> {
    return await getDefaultClient(opt).enter("getRegions", async (_, regionOptions) => {
      return await getRegionService(opt).getAllRegions(regionOptions);
    });
}
