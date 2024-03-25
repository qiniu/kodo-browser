import path from "path";
import fs, {promises as fsPromises} from "fs";
import request, {Response} from "request";

import downloadsFolder from "downloads-folder";

import {fetchUpdate} from "./fetch-version";

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
