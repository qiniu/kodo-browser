import {FileItem} from "@renderer/modules/qiniu-client";

export function isRecursiveDirectory(file: FileItem.Item, destPath: string): boolean {
  if (FileItem.isItemFile(file)) {
    return false;
  }
  return destPath.startsWith(file.path.toString());
}
