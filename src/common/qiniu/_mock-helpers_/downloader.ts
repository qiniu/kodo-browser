import fsPromises from "fs/promises";

export const MockDownloadContent = "mock download content";

export function mockDownloader() {
  const mockedDownloader = jest.fn();
  mockedDownloader.constructor = mockedDownloader;
  mockedDownloader.prototype.getObjectToFile = async function (_region: string, _obj: Object, tempFilepath: string) {
    await fsPromises.writeFile(
      tempFilepath,
      MockDownloadContent,
    );
    await new Promise(resolve => {
      setTimeout(resolve, 300);
    });
  };
  mockedDownloader.prototype.getObjectToFile =
    jest.fn(mockedDownloader.prototype.getObjectToFile);
  mockedDownloader.prototype.abort = jest.fn();

  return {
    __esModule: true,
    ...jest.requireActual("kodo-s3-adapter-sdk"),
    Downloader: mockedDownloader,
  };
}
