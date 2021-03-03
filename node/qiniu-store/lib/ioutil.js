'use strict';

const { Qiniu, Uploader, Downloader, KODO_MODE, S3_MODE } = require('kodo-s3-adapter-sdk'),
      { EventEmitter } = require('events'),
      { ThrottleOptions } = require('stream-throttle'),
      fsPromises = require('fs').promises,
      path = require('path'),
      mime = require('mime');

const {
  MIN_MULTIPART_SIZE,
  MAX_PUTOBJECT_SIZE,
  MAX_MULTIPART_COUNT
} = require('./consts');

exports.createClient = function(clientOptions, options) {
  return new Client(clientOptions, options);
};

class Client {
  constructor(clientOptions, options) {
    options = options ? options : {};

    const qiniu = new Qiniu(
      clientOptions.accessKey, clientOptions.secretKey, clientOptions.ucUrl,
      `Kodo-Browser/${options.kodoBrowserVersion}/ioutil`,
      clientOptions.regions);
    const callbacks = {};
    if (clientOptions.isDebug) {
      callbacks.requestCallback = debugRequest(clientOptions.backendMode);
      callbacks.responseCallback = debugResponse(clientOptions.backendMode);
    };
    this.client = qiniu.mode(clientOptions.backendMode, callbacks);
    this.uploader = new Uploader(this.client);
    this.downloader = new Downloader(this.client);

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
    const contenType = mime.getType(localFile);
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

    if (isOverwrite) {
      startUploadFile();
    } else {
      this.client.isExists(params.region, { bucket: params.bucket, key: params.key }).then((isExists) => {
        if (isExists) {
          eventEmitter.emit('fileDuplicated', eventEmitter);
        } else {
          startUploadFile();
        }
      }, () => {
        startUploadFile();
      });
    }

    process.on('uncaughtException', (err) => {
      handleError({
        error: err.message,
        stack: err.stack.split("\n")
      });
    });

    return eventEmitter;

    function startUploadFile() {
      fsPromises.stat(localFile).then((stats) => {
        if (isAborted) {
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
          return;
        }
        eventEmitter.progressLoaded = 0;
        eventEmitter.progressTotal = stats.size;
        eventEmitter.progressResumable = self.resumeUpload && (!recoveredOption || uploadedPartSize === self.multipartUploadSize);
        eventEmitter.emit('fileStat', eventEmitter);

        fsPromises.open(localFile, 'r').then((fileHandle) => {
          if (isAborted) {
            return;
          }

          const fileName = path.basename(localFile);
          let lastProgressTime = new Date();
          let uploadThrottleOption = undefined;

          if (self.uploadSpeedLimit) {
            uploadThrottleOption = { rate: self.uploadSpeedLimit * 1024 };
          }

          self.uploader.putObjectFromFile(params.region, { bucket: params.bucket, key: params.key }, fileHandle, stats.size, fileName, {
            header: { contenType: contenType },
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
              return;
            }
            eventEmitter.progressLoaded = eventEmitter.progressTotal;
            eventEmitter.emit('progress', eventEmitter);
            eventEmitter.emit('fileUploaded', eventEmitter);
          }).catch(handleError);
        }).catch((err) => {
          err.retryable = false;
          handleError(err);
        });
      }).catch((err) => {
        err.retryable = false;
        handleError(err);
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

    startDownloadFile();

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

      self.downloader.getObjectToFile(params.region, { bucket: params.bucket, key: params.key }, localFile, params.domain, {
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
