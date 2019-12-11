'use strict';

const AWS = require('aws-sdk'),
  EventEmitter = require('events').EventEmitter,
  fs = require('fs'),
  mime = require('mime'),
  {
    ReadableStream
  } = require('./stream'),
  {
    Throttle
  } = require('stream-throttle');

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
  this.s3concurrency = options.maxConcurrency || 10; // multipart io limitation!

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

  let localFile = params.localFile;
  let isOverwrite = params.overwriteDup;
  let isAborted = false;
  let isDebug = params.isDebug;

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
  let self = this;

  let localFile = params.localFile;
  let isAborted = false;
  let isDebug = params.isDebug;

  let s3downloader = null;
  let s3DownloadedBytes = params.downloadedBytes || 0;
  let s3DownloadedPartSize = params.downloadedPartSize || self.multipartDownloadSize;

  let downloader = new EventEmitter();
  downloader.setMaxListeners(0);
  downloader.progressLoaded = s3DownloadedBytes;
  downloader.progressTotal = 0;
  downloader.progressResumable = false;
  downloader.abort = handleAbort;

  let s3params = {};
  Object.assign(s3params, params.s3Params);

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
      downloadedPartSize: s3DownloadedPartSize
    });
  }

  function tryOpenFile() {
    self.s3.headObject(s3params, (err, metadata) => {
      if (err) {
        handleError(err);
        return;
      }

      downloader.progressTotal = metadata.ContentLength;
      downloader.progressResumable = (self.resumeDownload && s3DownloadedBytes < metadata.ContentLength);
      downloader.emit("fileStat", downloader);

      startDownloadFile();
    });
  }

  function startDownloadFile() {
    if (downloader.progressTotal >= self.multipartDownloadThreshold) {
      if (downloader.progressResumable) {
        resumeMultipartDownload();
      } else {
        startMultipartDownload();
      }
    } else {
      downloader.progressLoaded = 0;
      tryGettingObject((err, data) => {
        if (isAborted) return;

        if (err) {
          handleError(err);
          return;
        }

        downloader.emit('fileDownloaded', data);
      });
    }
  }

  function startMultipartDownload() {
    if (isAborted) return;

    let fileStream = fs.createWriteStream(localFile, {
      flags: 'w+',
      autoClose: true
    });

    let params = {
      Bucket: s3params.Bucket,
      Key: s3params.Key,
    };

    s3downloader = new ReadableStream(self.s3).download(params, {
      maxRetries: self.maxRetries,
      partSize: self.multipartDownloadSize,
      maxConcurrentStreams: self.s3concurrency,
      totalObjectSize: downloader.progressTotal,
      speedLimit: self.downloadSpeedLimit
    });
    s3downloader.on('progress', (prog) => {
      if (isAborted) return;

      downloader.progressLoaded += prog.loaded;
      downloader.emit('progress', downloader);
    });
    s3downloader.on('partDownloaded', (part) => {
      downloader.emit('filePartDownloaded', part);
    });
    s3downloader.on('debug', (data) => {
      downloader.emit('debug', data);
    })
    s3downloader.on('error', (err) => {
      if (isAborted) return;

      handleError(err);
    });
    fileStream.on('finish', () => {
      if (isAborted) return;

      downloader.emit('fileDownloaded');
    });
    fileStream.on('error', (err) => {
      if (isAborted) return;

      handleError(err);
    });
    s3downloader.pipe(fileStream);
  }

  function resumeMultipartDownload() {
    if (isAborted) return;

    if (fs.existsSync(localFile)) {
      s3DownloadedBytes = Math.min(fs.statSync(localFile).size, s3DownloadedBytes);
    } else {
      s3DownloadedBytes = 0;
    }

    const s3fsmode = fs.constants.O_CREAT | fs.constants.O_WRONLY | fs.constants.O_NONBLOCK;

    const fileStream = fs.createWriteStream(localFile, {
      flags: s3fsmode,
      start: s3DownloadedBytes,
      autoClose: true
    });

    const params = {
      Bucket: s3params.Bucket,
      Key: s3params.Key,
    };

    s3downloader = new ReadableStream(self.s3).download(params, {
      maxRetries: self.maxRetries,
      maxPartSize: self.multipartDownloadSize,
      maxConcurrentStreams: self.s3concurrency,
      totalObjectSize: downloader.progressTotal,
      totalBytesDownloaded: s3DownloadedBytes,
      speedLimit: self.downloadSpeedLimit
    });
    s3downloader.on('progress', (prog) => {
      if (isAborted) return;

      downloader.progressLoaded += prog.loaded;
      downloader.emit('progress', downloader);
    });
    s3downloader.on('partDownloaded', (part) => {
      downloader.emit('filePartDownloaded', part);
    });
    s3downloader.on('debug', (data) => {
      downloader.emit('debug', data);
    })
    s3downloader.on('error', (err) => {
      if (isAborted) return;

      handleError(err);
    });
    fileStream.on('finish', () => {
      if (isAborted) return;

      downloader.emit('fileDownloaded');
    });
    fileStream.on('error', (err) => {
      if (isAborted) return;

      handleError(err);
    });
    s3downloader.pipe(fileStream);
  }

  function tryGettingObject(cb) {
    if (isAborted) return;

    const fileStream = fs.createWriteStream(localFile, {
      flags: 'w+',
      autoClose: true
    });

    const params = {
      Bucket: s3params.Bucket,
      Key: s3params.Key,
    };

    s3downloader = self.s3.getObject(params).createReadStream();
    if (self.downloadSpeedLimit) {
      s3downloader = s3downloader.pipe(new Throttle({rate: self.downloadSpeedLimit * 1024}));
    }
    s3downloader.on('data', (chunk) => {
      if (isAborted) return;

      downloader.progressLoaded += chunk.length;
      downloader.emit('progress', downloader);
    });
    s3downloader.on('end', () => {
      if (isAborted) return;

      if (downloader.progressTotal != downloader.progressLoaded) {
        cb(new Error(`ContentLength mismatch, got ${downloader.progressLoaded}, expected ${downloader.progressTotal}`));
        return;
      }

      downloader.emit('progress', downloader);
      cb(null);
    });
    s3downloader.on('error', (err) => {
      if (isAborted) return;

      cb(err);
    });

    s3downloader.pipe(fileStream);
  }
};

function smallestPartSizeFromFileSize(fileSize) {
  var partSize = Math.ceil(fileSize / MAX_MULTIPART_COUNT);

  if (partSize < MIN_MULTIPART_SIZE) {
    return MIN_MULTIPART_SIZE;
  }

  return partSize + (MIN_MULTIPART_SIZE - partSize % MIN_MULTIPART_SIZE);
}
