import { Region } from "kodo-s3-adapter-sdk";

import { GetAdapterOptionParam, getDefaultClient, getRegionService } from "./common";
import { RegionWithStorageClasses } from "kodo-s3-adapter-sdk/dist/region";

interface RegionWithTranslatedLabel extends Region {
    translatedLabel?: string,
}

// TODO: @lihs remove param lang, because may display wrong text when change lang in setting(need check)
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

export async function getRegionsStorageClasses(
    opt: GetAdapterOptionParam,
): Promise<RegionWithStorageClasses[]> {
    return await getDefaultClient(opt).enter("getRegionsStorageClasses", async (_, regionOptions) => {
        return await getRegionService(opt).getAllRegionsStorageClasses(regionOptions)
    });
}
