import * as Cipher from './cipher'
import * as KodoNav from '@/const/kodo-nav'

const AUTH_INFO_KEY = "auth-info";
const CLOUD_CHOICE_KEY = "cloud-choice";

interface AuthInfo extends AuthInfoOption {
  id?: string,
  secret?: string,
  description?: string,
  isPublicCloud?: boolean,
  isAuthed?: boolean,
}

interface AuthInfoOption {
  address?: string,
  mode?: KodoNav.Mode,
}

export enum CloudServerType {
  Default = "default",
  Customized = "customized",
}

interface KVMapper {
  [AUTH_INFO_KEY]: AuthInfo,
  [CLOUD_CHOICE_KEY]: CloudServerType,
}

function _remove(key: keyof KVMapper) {
  localStorage.removeItem(key);
}

function _get<T extends keyof KVMapper>(key: T, defaultValue?: KVMapper[T]): KVMapper[T] | {} {
  const str = localStorage.getItem(key);
  if (str) {
    try {
      const decodeStr = Cipher.decipher(str);
      return JSON.parse(decodeStr);
    } catch (e) {
      console.log(e, str);
    }
  }
  return defaultValue || {};
}

function _save<T extends keyof KVMapper>(key: T, obj: KVMapper[T], defaultValue?: AuthInfo) {

  let str = JSON.stringify(obj || defaultValue || {});
  try {
    str = Cipher.cipher(str);
  } catch (e) {
    console.log(e);
  }
  localStorage.setItem(key, str);
}

export function saveToAuthInfo(opt: AuthInfoOption): void {
  const obj = {
    ..._get(AUTH_INFO_KEY),
    ...opt,
  };
  _save(AUTH_INFO_KEY, obj);
}

export function get(): AuthInfo {
  return _get(AUTH_INFO_KEY);
}

export function save(obj: AuthInfo): void {
  _save(AUTH_INFO_KEY, {
    ..._get(AUTH_INFO_KEY),
    ...obj,
  });
}

export function remove(): void {
  _remove(AUTH_INFO_KEY);
}

export function usePublicCloud(): boolean {
  return _get(CLOUD_CHOICE_KEY) === CloudServerType.Default
}

export function switchToPublicCloud(): void {
  _save(CLOUD_CHOICE_KEY, CloudServerType.Default);
}

export function switchToPrivateCloud(): void {
  _save(CLOUD_CHOICE_KEY, CloudServerType.Customized);
}
