'use strict';

const AWS = require('aws-sdk'),
      EventEmitter = require('events').EventEmitter,
      fs = require('fs'),
      urllib = require('urllib'),
      mime = require('mime'),
      { Throttle } = require('stream-throttle'),
      dnscache = require('dnscache')({ enable: true, ttl: 86400 });

const {
  MIN_MULTIPART_SIZE,
  MAX_PUTOBJECT_SIZE,
  MAX_MULTIPART_COUNT
} = require('./consts');

exports.AWS = AWS;
exports.Client = Client;

exports.createClient = function (options) {
  return new Client(options);
};

function Client(options) {
  options = options ? options : {};

  this.s3 = options.s3Client || new AWS.S3(options.s3Options);
  this.s3concurrency = options.maxConcurrency || 1; // multipart io limitation!

  this.resumeUpload = options.resumeUpload === true;
  this.multipartUploadThreshold = options.multipartUploadThreshold || (MIN_MULTIPART_SIZE * 10);
  this.multipartUploadSize = options.multipartUploadSize || (MIN_MULTIPART_SIZE * 2);

  this.resumeDownload = options.resumeDownload === true;
  this.multipartDownloadThreshold = options.multipartDownloadThreshold || (MIN_MULTIPART_SIZE * 10);
  this.multipartDownloadSize = options.multipartDownloadSize || (MIN_MULTIPART_SIZE * 2);

  this.uploadSpeedLimit = options.uploadSpeedLimit || false;
  this.downloadSpeedLimit = options.downloadSpeedLimit || false;

  if (this.multipartUploadSize < MIN_MULTIPART_SIZE) {
    throw new Error('Minimum multipartUploadSize is 4MB.');
  }
  if (this.multipartUploadSize > MAX_PUTOBJECT_SIZE) {
    throw new Error('Maximum multipartUploadSize is 5GB.');
  }
  if (this.multipartUploadThreshold < MIN_MULTIPART_SIZE) {
    throw new Error('Minimum multipartUploadThreshold is 4MB.');
  }
  if (this.multipartUploadThreshold > MAX_PUTOBJECT_SIZE) {
    throw new Error('Maximum multipartUploadThreshold is 5GB.');
  }
}

Client.prototype.uploadFile = function (params) {
  let self = this;

  const localFile = params.localFile;
  const isOverwrite = params.overwriteDup;
  let isAborted = false;

  let s3uploader = null;
  let s3uploadedId = params.uploadedId || null;
  let s3UploadedParts = params.uploadedParts || null;
  let s3UploadedPartSize = params.uploadedPartSize || self.multipartUploadSize;

  let uploader = new EventEmitter();
  uploader.setMaxListeners(0);
  uploader.progressLoaded = 0;
  uploader.progressTotal = 0;
  uploader.progressResumable = false;
  uploader.abort = handleAbort;

  let s3params = Object.assign({}, params.s3Params);
  if (s3params.ContentType === undefined) {
    let defaultContentType = params.defaultContentType || 'application/octet-stream';

    s3params.ContentType = mime.getType(localFile) || defaultContentType;
  }

  if (!isOverwrite) {
    self.s3.headObject({
      Bucket: s3params.Bucket,
      Key: s3params.Key,
    }, (err, data) => {
      if (err) {
        tryOpenFile();
      } else {
        uploader.emit("fileDuplicated", uploader);
      }
    });
  } else {
    tryOpenFile();
  }

  return uploader;

  process.on('uncaughtException', (err) => {
    handleError({
      error: err.message,
      stack: err.stack.split("\n")
    });
  });

  function handleError(err) {
    if (isAborted) return;

    if (err && err.retryable === false) {
      handleAbort();
    }

    if (err.message) {
      uploader.emit('error', `${err.name}: ${err.message}`);
    } else {
      uploader.emit('error', err.name);
    }
  }

  function handleAbort() {
    isAborted = true;

    if (s3uploader) {
      s3uploader.abort();
    }

    uploader.emit('abort', {
      uploadedParts: s3UploadedParts,
      uploadedPartSize: s3UploadedPartSize
    });
  }

  function tryOpenFile() {
    fs.stat(localFile, (err, stats) => {
      if (err) {
        err.retryable = false;

        handleError(err);
        return;
      }

      let partsCount = Math.ceil(stats.size / s3UploadedPartSize);
      if (partsCount > MAX_MULTIPART_COUNT) {
        s3UploadedPartSize = smallestPartSizeFromFileSize(stats.size);
      }
      if (s3UploadedPartSize > MAX_PUTOBJECT_SIZE) {
        let err = new Error(`File size exceeds maximum object size: ${localFile}`);
        err.retryable = false;

        handleError(err);
        return;
      }

      uploader.progressLoaded = 0;
      uploader.progressTotal = stats.size;
      uploader.progressResumable = (self.resumeUpload && (s3UploadedParts === null || s3UploadedPartSize === self.multipartUploadSize));
      uploader.emit("fileStat", uploader);

      startUploadFile();
    });
  }

  function startUploadFile() {
    if (uploader.progressTotal >= self.multipartUploadThreshold) {
      if (uploader.progressResumable) {
        resumeMultipartUpload();
      } else {
        startMultipartUpload();
      }
    } else {
      tryPuttingObject((err, data) => {
        if (isAborted) return;

        if (err) {
          handleError(err);
          return;
        }

        uploader.emit('fileUploaded', data);
      });
    }
  }

  function startMultipartUpload() {
    tryMultipartUpload((err, data) => {
      if (isAborted) return;

      if (err) {
        handleError(err);
        return;
      }

      uploader.emit('fileUploaded', data);
    });

    function tryMultipartUpload(cb) {
      if (isAborted) return;

      uploader.progressLoaded = 0;
      uploader.emit('progress', uploader);

      s3uploader = new AWS.S3.ManagedUpload({
        service: self.s3,
        params: {
          Bucket: s3params.Bucket,
          Key: s3params.Key,
          ContentType: s3params.ContentType,
          Body: createReadStream()
        },
        partSize: s3UploadedPartSize,
        queueSize: self.s3concurrency
      });

      s3uploader.on('httpUploadProgress', (prog) => {
        if (isAborted) return;

        uploader.progressLoaded = prog.loaded;
        uploader.emit('progress', uploader);
      });

      s3uploader.send((err, data) => {
        if (isAborted) return;

        if (err) {
          cb(err);
          return;
        }

        uploader.progressLoaded = uploader.progressTotal;
        uploader.emit('progress', uploader);

        cb(null, data);
      });
    }
  }

  function resumeMultipartUpload() {
    tryResumeMultipartUpload((err, data) => {
      if (isAborted) return;

      if (err) {
        handleError(err);
        return;
      }

      uploader.emit('fileUploaded', data);
    });

    function tryResumeMultipartUpload(cb) {
      if (isAborted) return;

      // calc uploaded progress
      let s3DoneParts = 0;
      if (s3UploadedParts) {
        s3UploadedParts.forEach((part) => {
          if (part && part.ETag !== null) {
            s3DoneParts++;

            uploader.progressLoaded += s3UploadedPartSize;
          }
        });

        uploader.emit('progress', uploader);
      } else {
        s3UploadedParts = [];
      }

      s3uploader = new AWS.S3.ManagedUpload({
        service: self.s3,
        params: {
          Bucket: s3params.Bucket,
          Key: s3params.Key,
          ContentType: s3params.ContentType,
          UploadId: s3uploadedId,
          Body: createReadStream()
        },
        leavePartsOnError: true,
        partSize: s3UploadedPartSize,
        queueSize: self.s3concurrency
      });
      s3uploader.doneParts = s3DoneParts;
      s3uploader.totalUploadedBytes = uploader.progressLoaded;
      s3uploader.completeInfo = s3UploadedParts.slice(0, s3UploadedParts.length);

      s3uploader.on('httpUploadProgress', (prog) => {
        if (isAborted) return;

        uploader.progressLoaded = prog.loaded;
        uploader.emit('progress', uploader);

        s3uploader.completeInfo.forEach((part, idx) => {
          if (part !== null && part.ETag !== null && !s3UploadedParts[part.PartNumber]) {
            s3UploadedParts[part.PartNumber] = part;

            uploader.emit('filePartUploaded', {
              uploadId: s3uploader.service.config.params.UploadId,
              part: part
            });
          }
        });
      });

      s3uploader.send((err, data) => {
        if (isAborted) return;

        if (err) {
          cb(err);
          return;
        }

        uploader.progressLoaded = uploader.progressTotal;
        uploader.emit('progress', uploader);

        cb(null, data);
      });
    }
  }

  function tryPuttingObject(cb) {
    s3params.ContentLength = uploader.progressTotal;
    s3params.Body = createReadStream();

    s3uploader = self.s3.putObject(s3params);

    s3uploader.on('httpUploadProgress', (prog) => {
      if (isAborted) return;

      uploader.progressLoaded = prog.loaded;
      uploader.emit('progress', uploader);
    });

    s3uploader.send((err, data) => {
      if (isAborted) return;

      if (err) {
        cb(err);
        return;
      }

      uploader.progressLoaded = uploader.progressTotal;
      uploader.emit('progress', uploader);

      cb(null, data);
    });
  }

  function createReadStream() {
    const readStream = fs.createReadStream(localFile);
    if (self.uploadSpeedLimit) {
      const streamWithThrottle = readStream.pipe(new Throttle({rate: self.uploadSpeedLimit * 1024}));
      streamWithThrottle.path = readStream.path;
      return streamWithThrottle;
    } else {
      return readStream;
    }
  }
};

Client.prototype.downloadFile = function (params) {
  const self = this;

  const RETRIES = 10;
  const localFile = params.localFile;
  const url = params.url;
  let isAborted = false;

  let s3downloader = null;
  let s3DownloadedBytes = params.downloadedBytes || 0;
  let s3DownloadedPartSize = params.downloadedPartSize || self.multipartDownloadSize;

  const downloader = new EventEmitter();
  downloader.setMaxListeners(0);
  downloader.progressLoaded = s3DownloadedBytes;
  downloader.progressTotal = 0;
  downloader.progressResumable = false;
  downloader.abort = handleAbort;

  tryOpenFile();

  return downloader;

  process.on('uncaughtException', (err) => {
    handleError({
      error: err.message,
      stack: err.stack.split("\n")
    });
  });

  function handleError(err) {
    if (isAborted) return;

    if (err && err.retryable === false) {
      handleAbort();
    }

    if (err.message) {
      downloader.emit('error', `${err.name}: ${err.message}`);
    } else {
      downloader.emit('error', err.name);
    }
  }

  function handleAbort() {
    isAborted = true;

    if (s3downloader && s3downloader.abort) {
      s3downloader.abort();
    }

    downloader.emit('abort', {
      downloadedBytes: s3DownloadedBytes,
    });
  }

  function tryOpenFile() {
    _tryOpenFile(0);

    function _tryOpenFile(retried) {
      const options = { method: 'GET', timeout: 5000, followRedirect: true, enableProxy: true, streaming: true, lookup: dnscache.lookup };

      urllib.request(url, options, (err, _, resp) => {
        if (err) {
          retry(err, retried);
          return;
        } else if (resp.statusCode < 0) {
          retry(new Error(`GET: ${resp.statusCode}`), retried);
          return;
        } else if (resp.statusCode < 200 || resp.statusCode >= 300) {
          handleError(new Error(`GET: ${resp.statusCode}`));
          return;
        }

        const contentLength = parseInt(resp.headers['content-length']);
        resp.destroy(null);

        downloader.progressTotal = contentLength;
        downloader.progressResumable = (self.resumeDownload && s3DownloadedBytes < contentLength);
        downloader.emit("fileStat", downloader);

        startDownloadFile();
      });
    }

    function retry(err, retried) {
      retried += 1;
      if (retried > RETRIES) {
        downloader.emit('debug', { type: 'error', error: err.message, retried: retried });
        handleError(err);
      } else {
        downloader.emit('debug', { type: 'retry', error: err.message, retried: retried });
        setTimeout(() => {
          _tryOpenFile(retried);
        }, 500*retried);
      }
    }
  }

  function startDownloadFile() {
    if (isAborted) return;

    if (downloader.progressResumable && fs.existsSync(localFile)) {
      s3DownloadedBytes = Math.min(fs.statSync(localFile).size, s3DownloadedBytes);
    } else {
      s3DownloadedBytes = 0;
    }

    downloadFile(s3DownloadedBytes, 0, 0);

    function downloadFile(startFrom, retried) {
      const s3fsmode = fs.constants.O_CREAT | fs.constants.O_WRONLY | fs.constants.O_NONBLOCK;
      const lastStartFrom = startFrom;
      let lastError = null;
      const fileStream = fs.createWriteStream(localFile, {
        flags: s3fsmode,
        start: startFrom,
        autoClose: true
      });
      isAborted = false;
      downloader.progressLoaded = startFrom;

      const headers = {};
      if (startFrom > 0) {
        headers['Range'] = `bytes=${startFrom}-`;
      }
      downloader.emit('debug', { type: 'request', url: url, headers: JSON.stringify(headers) });

      const options = { timeout: 30000, followRedirect: true, enableProxy: true, streaming: true, headers: headers, lookup: dnscache.lookup };
      urllib.request(url, options, (err, _, resp) => {
        if (err) {
          lastError = err;
          retry();
          return;
        } else if (resp.statusCode < 0) {
          lastError = new Error(`GET: ${resp.statusCode}`);
          retry();
          return;
        } else if (resp.statusCode < 200 || resp.statusCode >= 300) {
          handleError(new Error(`GET: ${resp.statusCode}`));
          return;
        }
        if (self.downloadSpeedLimit) {
          resp = resp.pipe(new Throttle({rate: self.downloadSpeedLimit * 1024}));
        }

        let thisPartSize = 0, tid = null;

        resp.on('data', (data) => {
          if (isAborted) return;

          if (tid) {
            clearTimeout(tid);
            tid = null;
          }
          tid = setTimeout(() => {
            resp.destroy(new Error('Timeout'));
          }, 30000);

          startFrom += data.byteLength;

          downloader.progressLoaded += data.byteLength;
          downloader.emit('progress', downloader);

          thisPartSize += data.byteLength;
          if (thisPartSize >= s3DownloadedPartSize) {
            downloader.emit('filePartDownloaded', { size: thisPartSize });
            thisPartSize = 0;
          }
        });
        resp.on('error', (err) => {
          if (isAborted) return;
          lastError = err;
          downloader.emit('debug', { type: 'error', error: err.message });
        });
        resp.on('aborted', () => {
          if (isAborted) return;
          downloader.emit('debug', { type: 'aborted' });
          isAborted = true;
          retry();
        });
        resp.on('end', () => {
          if (isAborted) return;
          downloader.emit('debug', { type: 'end' });

          if (downloader.progressTotal != downloader.progressLoaded) {
            handleError(new Error(`ContentLength mismatch, got ${downloader.progressLoaded}, expected ${downloader.progressTotal}`));
            return;
          }

          downloader.emit('fileDownloaded');
        }).pipe(fileStream);
      }).on('error', (err) => {
        if (isAborted) return;
        lastError = err;
        downloader.emit('debug', { type: 'request_error', error: err.message });
      });

      function retry() {
        if (startFrom != lastStartFrom) {
          retried = -1;
        }
        retried += 1;
        lastError = lastError || {};
        if (retried > RETRIES) {
          downloader.emit('debug', { type: 'error', error: lastError.message, retried: retried });
          handleError(lastError);
        } else {
          downloader.emit('debug', { type: 'retry', error: lastError.message, startFrom: startFrom, retried: retried });
          setTimeout(() => {
            downloadFile(startFrom, retried);
          }, 500*retried);
        }
      }
    }
  }
};

function smallestPartSizeFromFileSize(fileSize) {
  var partSize = Math.ceil(fileSize / MAX_MULTIPART_COUNT);

  if (partSize < MIN_MULTIPART_SIZE) {
    return MIN_MULTIPART_SIZE;
  }

  return partSize + (MIN_MULTIPART_SIZE - partSize % MIN_MULTIPART_SIZE);
}
