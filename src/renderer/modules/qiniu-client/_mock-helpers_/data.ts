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
        storageClasses: [],
    },
    {
        ...mockDataOfRegionBase,
        id: "region-id-2",
        s3Id: 'region-s3-id-2',
        // exist label but translatedLabels empty
        label: 'region-label-2',
        translatedLabels: {},
        storageClasses: [],
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
        storageClasses: [],
    },
    {
        ...mockDataOfRegionBase,
        id: "region-id-4",
        s3Id: 'region-s3-id-4',
        translatedLabels: {},
        storageClasses: [],
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
        storageClasses: [],
    },
    {
        ...mockDataOfRegionBase,
        id: "region-id-6",
        s3Id: 'region-s3-id-6',
        // exist matched translatedLabels but label
        translatedLabels: {
            "zh_CN": "中国中部",
        },
        storageClasses: [],
    },
];
