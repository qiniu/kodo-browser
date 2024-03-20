export function mockUploader() {
  const mockedUploader = jest.fn();
  mockedUploader.constructor = mockedUploader;
  mockedUploader.prototype.putObjectFromFile = async function () {
    await new Promise(resolve => {
      setTimeout(resolve, 300)
    });
  };
  mockedUploader.prototype.putObjectFromFile =
    jest.fn(mockedUploader.prototype.putObjectFromFile);
  mockedUploader.prototype.abort = jest.fn();

  return {
    __esModule: true,
    ...jest.requireActual("kodo-s3-adapter-sdk"),
    Uploader: mockedUploader,
  };
}
