import lodash from "lodash";

import * as LocalLogger from "@renderer/modules/local-logger";
import {PropsPath} from "./types";
import Dictionary from "./lang/dict";
import zhCN from "./lang/zh-cn";

export enum LangName {
  ZH_CN = "zh_CN",
  EN_US = "en_US",
  JA_JP = "ja_JP",
}

const dictionaryFetcherMap: Record<LangName, () => Promise<{ default: any }>> = {
  "zh_CN": () => import("./lang/zh-cn"),
  "en_US": () => import("./lang/en-us"),
  "ja_JP": () => import("./lang/ja-jp"),
}

let currentLang: LangName = LangName.ZH_CN;
let dictionary: Dictionary = zhCN;

async function fetchLang(lang: LangName): Promise<any> {
  return (await dictionaryFetcherMap[lang]()).default
}

export function getLang() {
  return currentLang;
}

export function translate(key: PropsPath<Dictionary>): string {
  return renderWithObject(lodash.get(dictionary, key, key), dictionary);
}

export async function setLang(lang: LangName): Promise<void> {
  dictionary = await fetchLang(lang);
  currentLang = lang;
  triggerLangeChange(currentLang, dictionary);
}

// event handlers
type Listener = {
  callback: (data: { lang: LangName, dictionary: Dictionary }) => void
};

const onLangeChangeListeners: Listener[] = [];

export function onLangeChange(callback: Listener["callback"]) {
  onLangeChangeListeners.push({
    callback,
  });
}

function triggerLangeChange(lang: LangName, dictionary: Dictionary) {
  onLangeChangeListeners.forEach(listener => {
    try {
      listener.callback({
        lang,
        dictionary,
      });
    } catch (e) {
      LocalLogger.error(e);
    }
  });
}

export function renderWithObject(str: string, obj: any) {
  return str.replace(/\$\{(\w+|\w+\.\w+)}/g, match => {
    const k = match.slice(2, -1); // remove ${}
    return lodash.get(obj, k, match);
  });
}

interface SplitVarItem {
  value: string,
  isVar: boolean,
}

export function splitVariables(str: string): SplitVarItem[] {
  const result: SplitVarItem[] = [];
  const reg = /\$\{(?<k>\w+|\w+\.\w+)}/g
  let match: RegExpExecArray | null;
  let lastIndex: number = 0;
  while (match = reg.exec(str)) {
    const [r] = match;
    const k = match.groups?.["k"];
    if (match.index > 0) {
      result.push({
        value: str.slice(lastIndex, match.index),
        isVar: false,
      });
    }
    result.push({
      value: k ?? "",
      isVar: true,
    });
    lastIndex = match.index + r.length;
  }
  if (lastIndex < str.length) {
    result.push({
      value: str.slice(lastIndex),
      isVar: false,
    });
  }
  return result;
}
