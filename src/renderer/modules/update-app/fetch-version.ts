import request from "request";

import Duration from "@common/const/duration";
import {upgrade} from "@renderer/customize";

import {compareVersion} from "./utils";

const CACHE_DURATION = Duration.Hour;

interface UpdateInfo {
  referer: string,
  downloadPageUrl: string,
  latestVersion: string,
  latestDownloadUrl: string,
  lastCheckTimestamp: number,
}

let cachedUpdateInfo: UpdateInfo = {
  referer: "",
  downloadPageUrl: "",
  latestVersion: "",
  latestDownloadUrl: "",
  lastCheckTimestamp: 0,
}

export async function fetchReleaseNote(version: string): Promise<string> {
  const resp = await new Promise<request.Response>((resolve, reject) => {
    request.get(
      {
        url: `${upgrade.release_notes_url}${version}.md`,
      },
      (error, response) => {
        if(error) {
          reject(error);
          return;
        }
        resolve(response);
      });
  });
  if (Math.floor(resp.statusCode / 100) !== 2) {
    return "Not Found";
  }
  return resp.body;
}


export async function fetchUpdate(): Promise<UpdateInfo> {
  if (Date.now() - cachedUpdateInfo.lastCheckTimestamp <= CACHE_DURATION) {
    return cachedUpdateInfo;
  }
  const resp = await new Promise<request.Response>((resolve, reject) => {
    request.get(
      {
        url: upgrade.check_url,
      },
      (error, response) => {
        if (error || Math.floor(response.statusCode / 100) !== 2) {
          reject(error);
          return;
        }
        resolve(response);
      }
    );
  });
  const respJson = JSON.parse(resp.body);
  cachedUpdateInfo = {
    referer: respJson.referer,
    downloadPageUrl: respJson["download_page"],
    latestVersion: respJson.version,
    latestDownloadUrl: respJson.downloads?.[process.platform]?.[process.arch] ?? "",
    lastCheckTimestamp: Date.now(),
  };
  return cachedUpdateInfo;
}

/**
 * return null if there isn't a new version
 */
export async function fetchLatestVersion(currentVersion: string): Promise<string | null> {
  const {latestVersion, latestDownloadUrl} = await fetchUpdate();
  if (!latestDownloadUrl) {
    return null;
  }
  return compareVersion(currentVersion, latestVersion) < 0
    ? latestVersion
    : null;
}
