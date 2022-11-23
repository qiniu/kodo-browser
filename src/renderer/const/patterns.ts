export const Email = /^\w+([-.]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

/*
 * not start with /
 * and
 * not end with /
 * and
 * no multiple / inside
 */
export const FileRename = /^[^\/]$|^[^\/]((?!\/\/).)*[^\/]$/;


export const BucketName = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/

/*
 * not include /
 */
export const DirectoryName = /^[^\/]+$/

export const HttpUrl = /^https?:\/\//
