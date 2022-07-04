export default interface StorageClass {
    fileType: number,
    kodoName: string,
    s3Name: string,
    billingI18n: Record<string, string>,
    nameI18n: Record<string, string>,
}
