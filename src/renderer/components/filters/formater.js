import webModule from "@/app-module/web";
import * as formatter from "@/components/filters/formatter";

export const TIME_FORMAT_FILTER_NAME = formatter.timeFormat.name
export const SIZE_FORMAT_FILTER_NAME = formatter.sizeFormat.name
export const FILE_ICON_FILTER_NAME = formatter.fileIcon.name
export const HTML_ESCAPE_FILTER_NAME = formatter.htmlEscape.name
export const I18N_FILTER_NAME = formatter.i18n.name
export const STATUS_CLS_FILTER_NAME = "statusCls"
export const STATUS_FILTER_NAME = "status"

webModule
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
    .filter(formatter.sub.name, () => formatter.sub.fn)
    .filter(formatter.hideSecret.name, () => formatter.hideSecret.fn)
    .filter(formatter.timeFormat.name, () => formatter.timeFormat.fn)
    .filter(formatter.elapse.name, () => formatter.elapse.fn)
    .filter(formatter.leftTimeFormat.name, () => formatter.leftTimeFormat.fn)
    .filter(formatter.sizeFormat.name, () => formatter.sizeFormat.fn)
    .filter(formatter.percent.name, () => formatter.percent.fn)
    .filter(formatter.fileIcon.name, () => formatter.fileIcon.fn)
    .filter(formatter.htmlEscape.name, () => formatter.htmlEscape.fn)
    .filter(formatter.i18n.name, [
        "$rootScope",
        function ($rootScope) {
            return function (obj, fallback) {
                return formatter.i18n.fn(obj, $rootScope.langSettings.lang, fallback);
            }
        }
    ])
