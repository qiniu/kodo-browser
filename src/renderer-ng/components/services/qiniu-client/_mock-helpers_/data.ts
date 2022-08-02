import { Region } from "kodo-s3-adapter-sdk";

/*
  * regions.ts
  * */

// getRegions

const mockDataOfRegionBase = {
    upUrls: [],
    ucUrls: [],
    rsUrls: [],
    rsfUrls: [],
    apiUrls: [],
    s3Urls: [],
};
export const mockDataOfGetAllRegions: Region[] = [
    {
        ...mockDataOfRegionBase,
        id: "region-id-1",
        s3Id: 'region-s3-id-1',
        // exist label and matched translatedLabels
        label: 'region-label-1',
        translatedLabels: {
            "zh_CN": "中国中部",
        },
    },
    {
        ...mockDataOfRegionBase,
        id: "region-id-2",
        s3Id: 'region-s3-id-2',
        // exist label but translatedLabels
        label: 'region-label-2',
    },
    {
        ...mockDataOfRegionBase,
        id: "region-id-3",
        s3Id: 'region-s3-id-3',
        // exist label but matched translatedLabels
        label: 'region-label-3',
        translatedLabels: {
            "en_US": "China Middle",
        },
    },
    {
        ...mockDataOfRegionBase,
        id: "region-id-4",
        s3Id: 'region-s3-id-4',
        // neither label and translatedLabels
    },
    {
        ...mockDataOfRegionBase,
        id: "region-id-5",
        s3Id: 'region-s3-id-5',
        // neither label and matched translatedLabels
        translatedLabels: {
            "en_US": "China Middle",
        },
    },
    {
        ...mockDataOfRegionBase,
        id: "region-id-6",
        s3Id: 'region-s3-id-6',
        // exist matched translatedLabels but label
        translatedLabels: {
            "zh_CN": "中国中部",
        },
    },
];
const expectRegionTranslatedLabels: (string | undefined)[] = [
    "中国中部", "region-label-2", "region-label-3", undefined, undefined, "中国中部"
];
export const expectDataOfGetAllRegions = expectRegionTranslatedLabels.map(
    (translatedLabel, index) => ({
        ...mockDataOfGetAllRegions[index],
        translatedLabel,
    })
);
