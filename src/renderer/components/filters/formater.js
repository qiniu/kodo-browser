import moment from "moment/moment"

import webModule from '@/app-module/web'

export const SUB_FILTER_NAME = 'sub'
export const HIDE_SECRET_FILTER_NAME = 'hideSecret'
export const TIME_FORMAT_FILTER_NAME = 'timeFormat'
export const ELAPSE_FORMAT_FILTER_NAME = "elapse"
export const LEFT_TIME_FORMAT_FILTER_NAME = "leftTimeFormat"
export const SIZE_FORMAT_FILTER_NAME = "sizeFormat"
export const PERSENT_FILTER_NAME = "persent"
export const STATUS_CLS_FILTER_NAME = "statusCls"
export const STATUS_FILTER_NAME = "status"
export const FILE_ICON_FILTER_NAME = "fileIcon"
export const HTML_ESCAPE_FILTER_NAME = "htmlEscape"

webModule
  .filter(SUB_FILTER_NAME, function () {
    return function (s, len) {
      if (!s) {
        return "";
      }

      if (s.length < len) return s;
      else return s.substring(0, len) + "...";
    };
  })
  .filter(HIDE_SECRET_FILTER_NAME, function () {
    return function (s) {
      if (!s) {
        return "";
      }

      if (s.length < 6) return "******";
      else return s.substring(0, 3) + "****" + s.substring(s.length - 3);
    };
  })
  .filter(TIME_FORMAT_FILTER_NAME, function () {
    return function (d, de) {
      de = de || "";
      try {
        if (!d) return de;
        var s = new Date(d);
        if (s == "Invalid date") {
          return de;
        }
        return moment(s).format("YYYY-MM-DD HH:mm:ss");
      } catch (e) {
        console.error(e)
        return de;
      }
    };
  })
  .filter(ELAPSE_FORMAT_FILTER_NAME, function () {
    return function (st, et) {
      et = et || new Date().getTime();

      var ms = et - st;

      if (isNaN(ms)) {
        return "";
      }
      if (ms <= 0) return 0;
      else if (ms < 1000) return ms + "ms";

      //return moment.duration(ms).humanize();
      var t = [];
      var h = Math.floor(ms / 3600 / 1000);
      if (h) {
        ms = ms - h * 3600 * 1000;
        t.push(h + "h");
      }
      var m = Math.floor(ms / 60 / 1000);
      if (m) {
        ms = ms - m * 60 * 1000;
        t.push(m + "m");
      }
      var s = Math.floor(ms / 1000);
      if (s) {
        ms = ms - s * 1000;
        t.push(s + "s");
      }
      return t.join("");
    };
  })
  .filter(LEFT_TIME_FORMAT_FILTER_NAME, [
    "utilSvs",
    function (utilSvs) {
      return function (ms) {
        return utilSvs.leftTime(ms);
      };
    }
  ])
  .filter(SIZE_FORMAT_FILTER_NAME, function () {
    return function (n, ex) {
      if (n == 0) return 0;
      if (!n) return "0";

      var t = [];
      var left = n;
      var gb = Math.floor(n / Math.pow(1024, 3));
      if (gb > 0) {
        if (ex) {
          t.push(gb + "G");
          left = left % Math.pow(1024, 3);
        } else {
          return Math.round(n * 100 / Math.pow(1024, 3)) / 100 + "GB";
        }
      }

      var mb = Math.floor(left / Math.pow(1024, 2));
      if (mb > 0) {
        if (ex) {
          t.push(mb + "M");
          left = left % Math.pow(1024, 2);
        } else {
          return Math.round(100 * left / Math.pow(1024, 2)) / 100 + "MB";
        }
      }

      var kb = Math.floor(left / 1024);
      if (kb > 0) {
        if (ex) {
          t.push(kb + "K");
          left = left % 1024;
        } else {
          return Math.round(100 * left / 1024) / 100 + "KB";
        }
      }

      if (left > 0) {
        t.push(left + "B");
        if (!ex) return left + "B";
      }
      return t.length > 0 ? t.join("") : 0;
    };
  })
  .filter(PERSENT_FILTER_NAME, function () {
    return function (a, b, status) {
      if (a == 0 && b == 0) {
        if (status == "finished") {
          return 100;
        } else return 0;
      }
      return Math.floor(a / b * 10000) / 100;
    };
  })
  .filter(STATUS_CLS_FILTER_NAME, [
    "jobUtil",
    function (jobUtil) {
      return function (s) {
        return jobUtil.getStatusCls(s);
      };
    }
  ])
  .filter(STATUS_FILTER_NAME, [
    "jobUtil",
    function (jobUtil) {
      return function (s, isUp) {
        return jobUtil.getStatusLabel(s, isUp);
      };
    }
  ])
  .filter(FILE_ICON_FILTER_NAME, [
    "fileSvs",
    function (fileSvs) {
      return function (item) {
        var info = fileSvs.getFileType(item);

        if (info.type == "folder") return "folder";
        if (info.type == "video") return "file-video-o";
        if (info.type == "audio") return "file-audio-o";
        if (info.type == "picture") return "file-image-o";
        if (info.type == "doc") {
          switch (info.ext[0]) {
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
        if (info.type == "code") return "file-text-o";
        if (info.type == "others") {
          switch (info.ext[0]) {
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
          case "sh":
            return "terminal";
          }
        }
        return "file-o";
      };
    }
  ])
  .filter(HTML_ESCAPE_FILTER_NAME, function () {
    return function (html) {
      return html.toString().replace(/[\u00A0-\u9999<>\&\'\"]/gim, function(char) {
        return '&#' + char.charCodeAt(0) + ';';
      });
    };
  });
