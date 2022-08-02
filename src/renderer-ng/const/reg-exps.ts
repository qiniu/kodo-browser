export const Email = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

/*
 * not start with /
 * and
 * not end with /
 * and
 * no multiple / inside
 */
export const FileRename = /^[^\/]$|^[^\/]((?!\/\/).)*[^\/]$/;
