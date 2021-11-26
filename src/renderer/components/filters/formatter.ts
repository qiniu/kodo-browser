import moment from "moment/moment"

import * as FileItem from "@/models/file-item";

import { leftTime } from "@/components/services/util"
import { FileExtensionType, getFileType } from '@/components/services/file.s'

export const sub = {
  name: "sub",
  fn: (s: string, len: number): string => {
    let result = ""
    if (!s) {
      return result
    }

    result = s.substring(0, len)

    if (s.length > len) {
      result += "..."
    }

    return result
  },
}

export const hideSecret = {
  name: "hideSecret",
  fn: (s: string): string => {
    if (s.length < 6) {
      return "******";
    } else {
      return s.substring(0, 3) + "****" + s.substring(s.length - 3);
    }
  },
};

type DateValue = string | number | Date

export const timeFormat = {
  name: "timeFormat",
  fn: (date: DateValue, backupResult: string = ""): string => {
    try {
      const copiedDate = new Date(date);
      if (Number.isNaN(copiedDate.valueOf())) {
        return backupResult;
      }
      return moment(copiedDate).format("YYYY-MM-DD HH:mm:ss");
    } catch (e) {
      console.error(e)
      return backupResult;
    }
  },
}

export const elapse = {
  name: "elapse",
  fn: (startTime: number, endTime: number = new Date().getTime()): string | number => {
    let ms = endTime - startTime;

    if (Number.isNaN(ms)) {
      return "";
    }

    if (ms <= 0) {
      return 0;
    } else if (ms < 1000) {
      return `${ms}ms`;
    }

    const t = [];
    const h = Math.floor(ms / 3600 / 1000);
    if (h) {
      ms -= h * 3600 * 1000;
      t.push(h + "h");
    }
    const m = Math.floor(ms / 60 / 1000);
    if (m) {
      ms = ms - m * 60 * 1000;
      t.push(m + "m");
    }
    const s = Math.floor(ms / 1000);
    if (s) {
      ms = ms - s * 1000;
      t.push(s + "s");
    }
    return t.join("");
  },
}

export const leftTimeFormat = {
  name: "leftTimeFormat",
  fn: (ms: number) => leftTime(ms),
}

export const sizeFormat = {
  name: "sizeFormat",
  fn: (n: number, isApproximate: boolean): string => {
    if (n == 0 || !n || n < 0) {
      return "0";
    }

    const t = [];
    let left = n;

    const gb = Math.floor(n / Math.pow(1024, 3));
    if (gb > 0) {
      if (isApproximate) {
        return Math.round(n * 100 / Math.pow(1024, 3)) / 100 + "GB";
      } else {
        t.push(gb + "G");
        left = left % Math.pow(1024, 3);
      }
    }

    const mb = Math.floor(left / Math.pow(1024, 2));
    if (mb > 0) {
      if (isApproximate) {
        return Math.round(100 * left / Math.pow(1024, 2)) / 100 + "MB";
      } else {
        t.push(mb + "M");
        left = left % Math.pow(1024, 2);
      }
    }

    const kb = Math.floor(left / 1024);
    if (kb > 0) {
      if (isApproximate) {
        return Math.round(100 * left / 1024) / 100 + "KB";
      } else {
        t.push(kb + "K");
        left = left % 1024;
      }
    }

    if (left > 0) {
      t.push(left + "B");
      if (isApproximate) return left + "B";
    }
    return t.length > 0 ? t.join("") : "0";
  }
}

export const percent = {
  name: "persent",
  fn: (a: number, b: number, status: string): number => {
    if (a == 0 && b == 0) {
      if (status == "finished") {
        return 100;
      } else {
        return 0;
      }
    }
    if (a == 0) {
      return 0;
    }
    return Math.min(
        Math.floor(a / b * 10000) / 100, 100
    );
  },
}

export const fileIcon = {
  name: "fileIcon",
  fn: (item: FileItem.Item): string => {
    const info = getFileType(item);

    if (info.type == FileExtensionType.Folder) {
      return "folder";
    }
    if (info.type == FileExtensionType.Video) {
      return "file-video-o";
    }
    if (info.type == FileExtensionType.Audio) {
      return "file-audio-o";
    }
    if (info.type == FileExtensionType.Picture) {
      return "file-image-o";
    }
    if (info.type == FileExtensionType.Document) {
      switch (info?.ext?.[0]) {
        case "doc":
        case "docx":
          return "file-word-o";
        case "pdf":
          return "file-pdf-o";
        case "ppt":
        case "pptx":
          return "file-powerpoint-o";
        case "exl":
          return "file-excel-o";
      }
      return "file-o";
    }
    if (info.type == FileExtensionType.Code) {
      switch (info?.ext?.[0]) {
        case "cmd":
        case "sh":
          return "terminal";
      }
      return "file-text-o";
    }
    if (info.type == FileExtensionType.Others) {
      switch (info?.ext?.[0]) {
        case "gz":
        case "tar":
        case "zip":
        case "jar":
        case "bz":
        case "war":
        case "xz":
          return "file-zip-o";
        case "pkg":
          return "dropbox";
        case "app":
        case "dmg":
          return "apple";
        case "apk":
          return "android";
        case "msi":
        case "deb":
        case "bin":
        case "exe":
          return "cog";
        case "img":
        case "iso":
          return "dot-circle-o";
        case "cmd":
          return "terminal";
      }
    }
    return "file-o";
  },
}

// can removed after use react, that will auto encode
export const htmlEscape = {
  name: "htmlEscape",
  fn: (strToHtmlEntitiesEncode: string):string => {
    return strToHtmlEntitiesEncode
        .replace(
            // \u00A0 is the start of "Latin-1 punctuation and symbols".
            // I guess this RegExp is want to just keep ASCCI symbols
            // and [<>&'"].
            // But have no idea about why keep "C1 controls" which range
            // is [\u0080, \u00A0). The range seems arbitrary.
            /[\u00A0-\u9999<>&'"]/gim,
            char => `&#${char.charCodeAt(0)};`
        );
  },
}
