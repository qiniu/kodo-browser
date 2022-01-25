import { promises as fsPromises } from 'fs'
import path from 'path'

import { Qiniu, Uploader, Downloader } from 'kodo-s3-adapter-sdk'
import { EventEmitter } from 'events'
import mime from 'mime'

import {
  MIN_MULTIPART_SIZE,
  MAX_PUTOBJECT_SIZE,
  MAX_MULTIPART_COUNT,
} from './consts'

EventEmitter.prototype._maxListeners = 1000

class Client {
  constructor(clientOptions, options) {
    options = options ? options : {};

    const qiniu = new Qiniu(
      clientOptions.accessKey, clientOptions.secretKey, clientOptions.ucUrl,
      `Kodo-Browser/${options.kodoBrowserVersion}/ioutil`,
      clientOptions.regions);

    const modeOpts = {
      appName: 'kodo-browser/ioutil',
      appVersion: options.kodoBrowserVersion,
      appNatureLanguage: clientOptions.userNatureLanguage,
    };
    if (clientOptions.isDebug) {
      modeOpts.requestCallback = debugRequest(clientOptions.backendMode);
      modeOpts.responseCallback = debugResponse(clientOptions.backendMode);
    }
    // disable uplog when use customize cloud
    // because there isn't a valid access key of uplog
    if (clientOptions.ucUrl) {
      modeOpts.uplogBufferSize = -1;
    }
    this.client = qiniu.mode(clientOptions.backendMode, modeOpts);
    this.uploader = undefined;
    this.downloader = undefined;

    this.resumeUpload = options.resumeUpload === true;
    this.multipartUploadThreshold = options.multipartUploadThreshold || (MIN_MULTIPART_SIZE * 10);
    this.multipartUploadSize = options.multipartUploadSize || (MIN_MULTIPART_SIZE * 2);

    this.resumeDownload = options.resumeDownload === true;
    this.multipartDownloadThreshold = options.multipartDownloadThreshold || (MIN_MULTIPART_SIZE * 10);
    this.multipartDownloadSize = options.multipartDownloadSize || (MIN_MULTIPART_SIZE * 2);

    this.uploadSpeedLimit = options.uploadSpeedLimit || false;
    this.downloadSpeedLimit = options.downloadSpeedLimit || false;

    if (this.multipartUploadSize < MIN_MULTIPART_SIZE) {
      throw new Error('Minimum multipartUploadSize is 4 MB.');
    }
    if (this.multipartUploadSize > MAX_PUTOBJECT_SIZE) {
      throw new Error('Maximum multipartUploadSize is 5 GB.');
    }
    if (this.multipartUploadThreshold < MIN_MULTIPART_SIZE) {
      throw new Error('Minimum multipartUploadThreshold is 4 MB.');
    }
    if (this.multipartUploadThreshold > MAX_PUTOBJECT_SIZE) {
      throw new Error('Maximum multipartUploadThreshold is 5 GB.');
    }
  }

  uploadFile(params) {
    const self = this;
    const localFile = params.localFile;
    const contentType = mime.getType(localFile);
    const isOverwrite = params.overwriteDup;
    let isAborted = false;

    let recoveredOption = undefined;
    if (params.uploadedId && params.uploadedParts) {
      recoveredOption = {
        uploadId: params.uploadedId,
        parts: params.uploadedParts,
      };
    }
    let uploadedPartSize = this.multipartUploadSize;
    const uploadThreshold = this.multipartUploadThreshold;

    const eventEmitter = new EventEmitter();
    eventEmitter.setMaxListeners(0);
    eventEmitter.progressLoaded = 0;
    eventEmitter.progressTotal = 0;
    eventEmitter.progressResumable = false;
    eventEmitter.abort = handleAbort;

    this.client.enter('uploadFile', (client) => {
      client.storageClasses = params.storageClasses;
      this.uploader = new Uploader(client);

      if (isOverwrite) {
        return startUploadFile();
      } else {
        return new Promise((resolve, reject) => {
          client.isExists(params.region, { bucket: params.bucket, key: params.key }).then((isExists) => {
            if (isExists) {
              eventEmitter.emit('fileDuplicated', eventEmitter);
              resolve();
            } else {
              startUploadFile().then(resolve).catch(reject);
            }
          }, () => {
            startUploadFile().then(resolve).catch(reject);
          });
        });
      }
    }, {
      targetBucket: params.bucket,
      targetKey: params.key,
    }).finally(() => {
      this.uploader = undefined;
    });

    process.on('uncaughtException', (err) => {
      handleError({
        error: err.message,
        stack: err.stack.split("\n")
      });
    });

    return eventEmitter;

    function startUploadFile() {
      return new Promise((resolve, reject) => {
        fsPromises.stat(localFile).then((stats) => {
          if (isAborted) {
            reject(new Error('Aborted'));
            return;
          }
          const partsCount = Math.ceil(stats.size / uploadedPartSize);
          if (partsCount > MAX_MULTIPART_COUNT) {
            uploadedPartSize = smallestPartSizeFromFileSize(stats.size);
          }
          if (uploadedPartSize > MAX_PUTOBJECT_SIZE) {
            const err = new Error(`File size exceeds maximum object size: ${localFile}`);
            err.retryable = false;
            handleError(err);
            reject(err);
            return;
          }
          eventEmitter.progressLoaded = 0;
          eventEmitter.progressTotal = stats.size;
          eventEmitter.progressResumable = self.resumeUpload && (!recoveredOption || uploadedPartSize === self.multipartUploadSize);
          eventEmitter.emit('fileStat', eventEmitter);

          fsPromises.open(localFile, 'r').then((fileHandle) => {
            if (isAborted) {
              reject(new Error('Aborted'));
              return;
            }

            const fileName = path.basename(localFile);
            let lastProgressTime = new Date();
            let uploadThrottleOption = undefined;

            if (self.uploadSpeedLimit) {
              uploadThrottleOption = { rate: self.uploadSpeedLimit * 1024 };
            }

            self.uploader.putObjectFromFile(params.region, { bucket: params.bucket, key: params.key, storageClassName: params.storageClassName }, fileHandle, stats.size, fileName, {
              header: { contentType },
              recovered: recoveredOption,
              uploadThreshold: uploadThreshold,
              partSize: uploadedPartSize,
              putCallback: {
                partsInitCallback: (recovered) => {
                  recoveredOption = recovered;
                },
                partPutCallback: (part) => {
                  if (isAborted) {
                    return;
                  }
                  eventEmitter.emit('filePartUploaded', {
                    uploadId: recoveredOption.uploadId,
                    part: part,
                  });
                },
                progressCallback: (uploaded) => {
                  if (isAborted) {
                    return;
                  }
                  eventEmitter.progressLoaded = uploaded;
                  if (eventEmitter.progressLoaded > eventEmitter.progressTotal) {
                    eventEmitter.progressLoaded = eventEmitter.progressTotal;
                  }

                  const now = new Date();
                  if (now - lastProgressTime > 1000) {
                    lastProgressTime = now;
                    eventEmitter.emit('progress', eventEmitter);
                  }
                },
                uploadThrottleOption: uploadThrottleOption,
              },
            }).then(() => {
              if (isAborted) {
                reject(new Error('Aborted'));
                return;
              }
              eventEmitter.progressLoaded = eventEmitter.progressTotal;
              eventEmitter.emit('progress', eventEmitter);
              eventEmitter.emit('fileUploaded', eventEmitter);
              resolve();
            }).catch((err) => {
              handleError(err);
              reject(err);
            });
          }).catch((err) => {
            err.retryable = false;
            handleError(err);
            reject(err);
          });
        }).catch((err) => {
          err.retryable = false;
          handleError(err);
          reject(err);
        });
      });
    }

    function handleError(err) {
      if (isAborted) return;

      if (err && err.retryable === false) {
        handleAbort();
      }

      if (err.message) {
        eventEmitter.emit('error', `${err.name}: ${err.message}`);
      } else {
        eventEmitter.emit('error', err.name);
      }
    }

    function handleAbort() {
      if (isAborted) return;
      isAborted = true;

      if (self.uploader) {
        self.uploader.abort();
      }

      eventEmitter.emit('abort', {});
    }

    function smallestPartSizeFromFileSize(fileSize) {
      const partSize = Math.ceil(fileSize / MAX_MULTIPART_COUNT);

      if (partSize < MIN_MULTIPART_SIZE) {
        return MIN_MULTIPART_SIZE;
      }

      return partSize + (MIN_MULTIPART_SIZE - partSize % MIN_MULTIPART_SIZE);
    }
  }

  downloadFile(params) {
    const self = this;
    const localFile = params.localFile;
    let isAborted = false;

    let downloadedBytes = params.downloadedBytes || 0;
    let downloadedPartSize = this.multipartDownloadSize;

    if (!this.resumeDownload) {
      downloadedBytes = 0;
    }

    const eventEmitter = new EventEmitter();
    eventEmitter.setMaxListeners(0);
    eventEmitter.progressLoaded = 0;
    eventEmitter.progressTotal = 0;
    eventEmitter.progressResumable = self.resumeDownload;
    eventEmitter.abort = handleAbort;

    this.client.enter('downloadFile', (client) => {
      this.downloader = new Downloader(client);
      return startDownloadFile().finally(() => {
        this.downloader = undefined;
      });
    }, {
      targetBucket: params.bucket,
      targetKey: params.key,
    });

    process.on('uncaughtException', (err) => {
      handleError({
        error: err.message,
        stack: err.stack.split("\n")
      });
    });

    return eventEmitter;

    function startDownloadFile() {
      let downloadThrottleOption = undefined;
      if (self.downloadSpeedLimit) {
        downloadThrottleOption = { rate: self.downloadSpeedLimit * 1024 };
      }

      eventEmitter.emit('progress', eventEmitter);
      let lastProgressTime = new Date();

      return self.downloader.getObjectToFile(params.region, { bucket: params.bucket, key: params.key }, localFile, params.domain, {
        recoveredFrom: downloadedBytes,
        partSize: downloadedPartSize,
        chunkTimeout: 30000,
        retriesOnSameOffset: 10,
        downloadThrottleOption: downloadThrottleOption,
        getCallback: {
          headerCallback: (header) => {
            if (isAborted) {
              return;
            }
            eventEmitter.progressTotal = header.size;
            eventEmitter.emit('fileStat', eventEmitter);
          },
          partGetCallback: (partSize) => {
            if (isAborted) {
              return;
            }
            downloadedBytes += partSize;
            eventEmitter.emit('filePartDownloaded', { size: partSize });
          },
          progressCallback: (downloaded, total) => {
            if (isAborted) {
              return;
            }
            eventEmitter.progressLoaded = downloaded;
            if (eventEmitter.progressLoaded > eventEmitter.progressTotal) {
              eventEmitter.progressLoaded = eventEmitter.progressTotal;
            }

            const now = new Date();
            if (now - lastProgressTime > 1000) {
              lastProgressTime = now;
              eventEmitter.emit('progress', eventEmitter);
            }
          },
        },
      }).then(() => {
        if (isAborted) {
          return;
        }

        eventEmitter.progressLoaded = eventEmitter.progressTotal;
        eventEmitter.emit('progress', eventEmitter);
        eventEmitter.emit('fileDownloaded', eventEmitter);
      }).catch(handleError);
    }

    function handleError(err) {
      if (isAborted) return;

      if (err && err.retryable === false) {
        handleAbort();
      }

      if (err.message) {
        eventEmitter.emit('error', `${err.name}: ${err.message}`);
      } else {
        eventEmitter.emit('error', err.name);
      }
    }

    function handleAbort() {
      if (isAborted) return;
      isAborted = true;

      if (self.downloader) {
        self.downloader.abort();
      }

      eventEmitter.emit('abort', {});
    }
  }
}

function debugRequest(mode) {
  return (request) => {
    let url = undefined, method = undefined, headers = undefined;
    if (request) {
      url = request.url;
      method = request.method;
      headers = request.headers;
    }
    console.info('>>', mode, 'REQ_URL:', url, 'REQ_METHOD:', method, 'REQ_HEADERS:', headers);
  };
}

function debugResponse(mode) {
  return (response) => {
    let requestUrl = undefined, requestMethod = undefined, requestHeaders = undefined,
        responseStatusCode = undefined, responseHeaders = undefined, responseInterval = undefined, responseData = undefined, responseError = undefined;
    if (response) {
        responseStatusCode = response.statusCode;
        responseHeaders = response.headers;
        responseInterval = response.interval;
        responseData = response.data;
        responseError = response.error;
      if (response.request) {
        requestUrl = response.request.url;
        requestMethod = response.request.method;
        requestHeaders = response.request.headers;
      }
    }
    console.info('<<', mode, 'REQ_URL:', requestUrl, 'REQ_METHOD:', requestMethod, 'REQ_HEADERS: ', requestHeaders,
        'RESP_STATUS:', responseStatusCode, 'RESP_HEADERS:', responseHeaders, 'RESP_INTERVAL:', responseInterval, 'ms RESP_DATA:', responseData, 'RESP_ERROR:', responseError);
  };
}

export function createClient(clientOptions, options) {
  return new Client(clientOptions, options);
}
