export const ADDR_KODO_PROTOCOL = "kodo://"

export function isAddrKodoProtocal(path: string) {
    path.startsWith(ADDR_KODO_PROTOCOL);
}

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
