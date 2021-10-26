import { Region } from "kodo-s3-adapter-sdk";

import { GetAdapterOptionParam, getDefaultClient, getRegionService } from "./common";

interface RegionWithTranslatedLabel extends Region {
    translatedLabel?: string,
}
export async function getRegions(
    lang: string,
    opt: GetAdapterOptionParam,
): Promise<RegionWithTranslatedLabel[]> {
    return await getDefaultClient(opt).enter("getRegions", async (_, regionOptions) => {
        const regions = await getRegionService(opt).getAllRegions(regionOptions);
        const regionLang = lang.replace("-", "_");
        return regions.map(r => ({
            ...r,
            translatedLabel: r?.translatedLabels?.[regionLang] ?? r.label,
        }));
    });
}
