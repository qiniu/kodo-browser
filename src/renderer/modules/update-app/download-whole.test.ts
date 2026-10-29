import path from "path";
import fs, {promises as fsPromises} from "fs";
import {EventEmitter} from "events";
import {PassThrough, Writable} from "stream";
import request from "request";

import {fetchUpdate} from "./fetch-version";
import {downloadLatestVersion} from "./download-whole";

jest.mock("path", () => ({...jest.requireActual("path")}));
jest.mock("downloads-folder", () => jest.fn());
jest.mock("./fetch-version", () => ({fetchUpdate: jest.fn()}));
jest.mock("request", () => Object.assign(jest.fn(), {head: jest.fn()}));

const mockedFetchUpdate = fetchUpdate as jest.MockedFunction<typeof fetchUpdate>;
const mockedRequest = request as jest.MockedFunction<typeof request>;
const mockedHead = request.head as jest.MockedFunction<typeof request.head>;

describe.each([
  ["POSIX", path.posix, "/downloads"],
  ["Windows", path.win32, "C:\\Downloads"],
] as const)("downloadLatestVersion on %s", (_platform, paths, toDirectory) => {
  const onProgress = jest.fn(() => true);

  function setDownloadUrl(latestDownloadUrl: string) {
    mockedFetchUpdate.mockResolvedValue({
      latestDownloadUrl,
      referer: "https://updates.example.com",
      downloadPageUrl: "",
      latestVersion: "2.3.4",
      lastCheckTimestamp: 0,
    });
  }

  beforeEach(() => {
    const join = paths.join;
    const basename = paths.basename;
    jest.spyOn(path, "join").mockImplementation(join);
    jest.spyOn(path, "basename").mockImplementation(basename);
    jest.spyOn(fsPromises, "stat").mockResolvedValue({size: 6} as fs.Stats);
    jest.spyOn(fsPromises, "rename").mockResolvedValue();
    jest.spyOn(fs, "createWriteStream").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it.each([
    "..%2f..%2f..%2fevil.exe",
    "%2E%2E%2F%2E%2E%2Fevil.exe",
    "..%5c..%5cevil.exe",
    "%2E%2E%5C%2E%2E%5Cevil.exe",
    "..%2f..%5cevil.exe",
    "%2ftmp%2fevil.exe",
    "%5c%5cserver%5cshare%5cevil.exe",
    "C%3Aevil.exe",
    "update.exe%3Astream",
    "update%00.exe",
    "",
    ".",
    "..",
    "%2e",
    "%2e%2e",
  ])("rejects unsafe filename %s before accessing files or downloading", fileName => {
    setDownloadUrl(`https://updates.example.com/${fileName}`);
    return expectRejectedDownload("update URL does not include a valid file name");
  });

  it.each([
    "not a URL",
    "https://updates.example.com/update%.exe",
    "https://updates.example.com/update%C0%AF.exe",
  ])("rejects malformed URL or encoding: %s", latestDownloadUrl => {
    setDownloadUrl(latestDownloadUrl);
    return expectRejectedDownload();
  });

  async function expectRejectedDownload(message?: string) {
    await expect(downloadLatestVersion({toDirectory, onProgress})).rejects.toThrow(message);
    expect(fsPromises.stat).not.toHaveBeenCalled();
    expect(fs.createWriteStream).not.toHaveBeenCalled();
    expect(fsPromises.rename).not.toHaveBeenCalled();
    expect(mockedHead).not.toHaveBeenCalled();
    expect(mockedRequest).not.toHaveBeenCalled();
    expect(onProgress).not.toHaveBeenCalled();
  }

  it.each([
    ["releases/update.exe", "update.exe"],
    ["releases/Kodo%20Browser%20%E4%B8%AD%E6%96%87.zip", "Kodo Browser 中文.zip"],
    ["update.exe?download=/other.exe#fragment", "update.exe"],
    ["update.exe?name=..%2F..%2Fevil.exe", "update.exe"],
    ["update%252f.exe", "update%2f.exe"],
  ])("uses the decoded pathname filename for %s", async (urlPath, fileName) => {
    setDownloadUrl(`https://updates.example.com/${urlPath}`);
    const destination = paths.join(toDirectory, fileName);

    await expect(downloadLatestVersion({toDirectory, onProgress})).resolves.toBe(destination);
    expect(fsPromises.stat).toHaveBeenCalledWith(destination);
    expect(onProgress).toHaveBeenCalledWith(6, 6);
    expect(mockedHead).not.toHaveBeenCalled();
    expect(fs.createWriteStream).not.toHaveBeenCalled();
  });

  it("writes the temporary and final update inside the download directory", async () => {
    const latestDownloadUrl = "https://updates.example.com/Kodo%20Browser.zip?download=/other.zip";
    setDownloadUrl(latestDownloadUrl);
    jest.spyOn(fsPromises, "stat").mockRejectedValue(new Error("ENOENT"));
    const chunks: Buffer[] = [];
    const writer = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(chunk);
        callback();
      },
    });
    jest.spyOn(fs, "createWriteStream").mockReturnValue(writer as fs.WriteStream);
    mockedHead.mockImplementationOnce(() => {
      const head = new EventEmitter();
      process.nextTick(() => head.emit("response", {
        statusCode: 200,
        headers: {"content-length": "6"},
      }));
      return head as request.Request;
    });
    mockedRequest.mockImplementationOnce(() => {
      const download = new PassThrough();
      process.nextTick(() => download.end("update"));
      return download as unknown as request.Request;
    });
    const destination = paths.join(toDirectory, "Kodo Browser.zip");

    await expect(downloadLatestVersion({toDirectory, onProgress})).resolves.toBe(destination);
    expect(fs.createWriteStream).toHaveBeenCalledWith(`${destination}.download`, {start: 0});
    expect(fsPromises.rename).toHaveBeenCalledWith(`${destination}.download`, destination);
    expect(Buffer.concat(chunks).toString()).toBe("update");
    expect(mockedRequest).toHaveBeenCalledWith({
      url: latestDownloadUrl,
      headers: {Range: "bytes=0-", Referer: "https://updates.example.com"},
    });
  });
});
