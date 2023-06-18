import path from "path";
import fs, {promises as fsPromises} from "fs";
import request, {Response} from "request";

import downloadsFolder from "downloads-folder";

import Duration from "@common/const/duration";
import {upgrade} from "@renderer/customize";

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

function compareVersion(current: string, latest: string) {
  const arr = current.split(".");
  const arr2 = latest.split(".");

  const len = Math.max(arr.length, arr2.length);

  for (let i = 0; i < len; i++) {
    const a = parseInt(arr[i]) || 0;
    const b = parseInt(arr2[i]) || 0;

    if (a > b) {
      return 1;
    } else if (a < b) {
      return -1;
    }
  }
  return 0;
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

async function getFileSize(
  filePath: string,
): Promise<{
  isFileExists: boolean,
  fileSize: number,
}> {
  try {
    const stat = await fsPromises.stat(filePath);
    return {
      isFileExists: true,
      fileSize: stat.size,
    };
  } catch {
    return {
      isFileExists: false,
      fileSize: 0,
    };
  }
}

async function checkFile({
  tempPath,
  toPath,
}: {
  tempPath: string,
  toPath: string,
}) {
  // skip check file(tempPath), because etag is unreliable.
  // TODO: head and check x-qiniu-hash-crc64ecma header when server implement it.
  if (tempPath === toPath) {
    return;
  }
  await fsPromises.rename(tempPath, toPath);
}

export async function downloadLatestVersion({
  toDirectory = downloadsFolder(),
  onProgress,
}: {
  toDirectory?: string,
  // if return false will stop download
  onProgress: (loaded: number, total: number) => boolean,
}): Promise<string> {
  const {latestDownloadUrl, referer} = await fetchUpdate();

  const fileName = decodeURIComponent(path.basename(latestDownloadUrl));
  const to = path.join(toDirectory, fileName);

  // check is downloaded
  const {
    isFileExists,
    fileSize,
  } = await getFileSize(to);
  if (isFileExists) {
    onProgress(fileSize, fileSize);
    await checkFile({
      tempPath: to,
      toPath: to,
    });
    return to;
  }

  // get remote file info
  const response = await new Promise<Response>((resolve, reject) => {
    request.head({
      url: latestDownloadUrl,
      headers: {
        "Referer": referer,
      },
    })
      .on("error", reject)
      .on("response", resolve);
  });
  if (response.statusCode !== 200) {
    throw new Error(`head file errored: ${response.statusCode}, msg: ${response.body}`);
  }
  const fileTotalSize = parseInt(response.headers["content-length"] ?? "0", 10);

  // get downloaded file info
  const downloadedFilePath = `${to}.download`;
  const {
    isFileExists: isTempFileExists,
    fileSize: tempFileSize,
  } = await getFileSize(downloadedFilePath);
  if (isTempFileExists) {
    onProgress(tempFileSize, fileTotalSize);
  }

  // download file
  let downloadedSize = tempFileSize;
  await new Promise((resolve, reject) => {
    const fileWriter = fs.createWriteStream(downloadedFilePath, {
      start: downloadedSize,
    });
    fileWriter.on("error", err => {
      if (req) {
        req.abort();
      }
      reject(err);
    });
    const req = request({
      url: latestDownloadUrl,
      headers: {
        "Range": `bytes=${downloadedSize}-`,
        "Referer": referer,
      },
    });
    req.on("error", reject)
      .on("data", chunk => {
        downloadedSize += chunk.length;
        if (!onProgress(downloadedSize, fileTotalSize)) {
          req.abort();
        }
        return chunk;
      })
      .pipe(fileWriter)
      .on("finish", resolve);
  });

  await checkFile({
    tempPath: downloadedFilePath,
    toPath: to,
  });
  return to;
}
