export const ADDR_KODO_PROTOCOL = "kodo://"

export enum Mode {
    LocalBuckets = "localBuckets",
    LocalFiles = "localFiles",
    ExternalPaths = "externalPaths",
    ExternalFiles = "externalFiles",
}

export function isModeLocal(mode: Mode) {
    return mode.startsWith("local");
}

export function isModeExternal(mode: Mode) {
    return mode.startsWith("external")
}
