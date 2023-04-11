import path from "path";
import fs, {promises as fsPromises} from "fs";
import request, {Response} from "request";

import downloadsFolder from "downloads-folder";

import Duration from "@common/const/duration";
import {upgrade} from "@renderer/customize";

const CACHE_DURATION = Duration.Hour;

let latestVersion: string = "";
let latestDownloadUrl: string = "";
let lastCheckTimestamp: number = 0;

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
  const resp = await fetch(`${upgrade.release_notes_url}${version}.md`);
  if (Math.floor(resp.status / 100) !== 2) {
    return "Not Found";
  }
  return resp.text();
}

/**
 * return null if there isn't a new version
 */
export async function fetchLatestVersion(currentVersion: string): Promise<string | null> {
  if (Date.now() - lastCheckTimestamp <= CACHE_DURATION) {
    return compareVersion(currentVersion, latestVersion) < 0
      ? latestVersion
      : null;
  }
  const resp = await fetch(upgrade.check_url);
  const respJson = await resp.json();
  lastCheckTimestamp = Date.now();
  latestVersion = respJson.version;
  latestDownloadUrl = respJson.downloads[process.platform][process.arch];
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
  if (!latestDownloadUrl || Date.now() - lastCheckTimestamp <= CACHE_DURATION) {
    await fetchLatestVersion("");
  }

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
    request.head(latestDownloadUrl)
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
  const fileWriter = fs.createWriteStream(downloadedFilePath, {
    // old code is `flags: ...`. maybe it's a mistake
    // mode: fs.constants.O_CREAT | fs.constants.O_WRONLY | fs.constants.O_NONBLOCK,
    start: downloadedSize,
  });
  await new Promise((resolve, reject) => {
    const req = request({
      url: latestDownloadUrl,
      headers: {
        "Range": `bytes=${downloadedSize}-`
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
