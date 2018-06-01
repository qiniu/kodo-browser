'use strict';

let AWS = require('aws-sdk'),
  EventEmitter = require('events').EventEmitter,
  fs = require('fs'),
  mime = require('mime'),
  pend = require('pend'),
  {
    BufferTransform
  } = require('./transform');

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
  this.s3stream = new BufferTransform({
    size: options.bufferSize || 4 << 20 // default to 4M
  });

  this.s3pend = new pend();
  this.s3pend.max = options.maxConcurrency || 10; // connection limit for per domain!

  this.resumeUpload = options.resumeUpload === true;
  this.multipartUploadThreshold = options.multipartUploadThreshold || (MIN_MULTIPART_SIZE * 10);
  this.multipartUploadSize = options.multipartUploadSize || (MIN_MULTIPART_SIZE * 2);

  this.resumeDownload = options.resumeDownload === true;
  this.multipartDownloadThreshold = options.multipartDownloadThreshold || (MIN_MULTIPART_SIZE * 10);
  this.multipartDownloadSize = options.multipartDownloadSize || (MIN_MULTIPART_SIZE * 2);

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
  let localFileStat = null;

  let isOverwrite = params.overwriteDup;
  let isAborted = false;
  let isDebug = params.isDebug;

  let uploader = new EventEmitter();
  uploader.setMaxListeners(0);
  uploader.progressLoaded = 0;
  uploader.progressTotal = 0;
  uploader.progressPartSize = params.uploadedPartSize;
  uploader.progressParts = params.uploadedParts || null;
  uploader.abort = handleAbort;

  params.s3Params.Key = encodeSpecialCharacters(params.s3Params.Key);

  let s3params = {};
  Object.assign(s3params, params.s3Params);

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

  process.on('uncaughtException', function (err) {
    handleError(err);
  });

  function handleError(err) {
    if (isAborted) return;
    isAborted = true;

    if (err && err.retryable === false) {
      handleAbort();
    }

    uploader.emit('error', err);
  }

  function handleAbort() {
    isAborted = true;

    uploader.emit('abort');
  }

  function tryOpenFile() {
    fs.stat(localFile, function (err, stats) {
      if (err) {
        err.retryable = false;

        handleError(err);
        return;
      }

      localFileStat = stats;

      uploader.progressLoaded = 0;
      uploader.progressTotal = stats.size;
      uploader.emit("fileStat", uploader);

      startUploadFile();
    });
  }

  function startUploadFile() {
    if (localFileStat.size >= self.multipartUploadThreshold) {
      let partSize = self.multipartUploadSize;
      let partsCount = Math.ceil(localFileStat.size / partSize);
      if (partsCount > MAX_MULTIPART_COUNT) {
        partSize = smallestPartSizeFromFileSize(localFileStat.size);
      }
      if (partSize > MAX_PUTOBJECT_SIZE) {
        let err = new Error(`File size exceeds maximum object size: ${localFile}`);
        err.retryable = false;

        handleError(err);
        return;
      }

      self.multipartUploadSize = partSize;

      if (self.resumeUpload &&
        (uploader.progressParts === null ||
          self.multipartUploadSize === uploader.progressPartSize)) {
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

      var s3uploader = new AWS.S3.ManagedUpload({
        service: self.s3,
        params: {
          Bucket: s3params.Bucket,
          Key: s3params.Key,
          Body: fs.createReadStream(localFile)
        },
        partSize: self.multipartUploadSize,
        queueSize: self.maxConcurrency
      });
      s3uploader.on('httpUploadProgress', function (prog) {
        if (isAborted) return;

        uploader.progressLoaded = prog.loaded;
        uploader.emit('progress', uploader);
      });
      s3uploader.send(function (err, data) {
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

      angular.forEach(uploader.progressParts, (part, partNumber) => {
        if (part.ETag !== null) {
          uploader.progressLoaded += self.multipartUploadSize;
        }
      });
      uploader.emit('progress', uploader);

      var s3uploader = new AWS.S3.ManagedUpload({
        service: self.s3,
        params: {
          Bucket: s3params.Bucket,
          Key: s3params.Key,
          Body: fs.createReadStream(localFile)
        },
        leavePartsOnError: true,
        partSize: self.multipartUploadSize,
        queueSize: self.maxConcurrency
      });
      s3uploader.completeInfo = uploader.progressParts;

      s3uploader.on('httpUploadProgress', function (prog) {
        if (isAborted) return;

        uploader.progressParts = s3uploader.completeInfo;
        uploader.progressLoaded = prog.loaded;
        uploader.emit('progress', uploader);
      });
      s3uploader.send(function (err, data) {
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
    s3params.ContentLength = localFileStat.size;
    s3params.Body = fs.createReadStream(localFile);

    let s3uploader = self.s3.putObject(s3params);
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
};

Client.prototype.downloadFile = function (params) {
  let self = this;

  let localFile = params.localFile;
  let localFileSize = 0;

  let isAborted = false;
  let isDebug = params.isDebug;

  let uploader = new EventEmitter();
  uploader.setMaxListeners(0);
  uploader.progressLoaded = 0;
  uploader.progressTotal = 0;
  uploader.progressPartSize = params.downloadedPartSize;
  uploader.progressParts = params.downloadedParts || [];
  uploader.abort = handleAbort;

  params.s3Params.Key = encodeSpecialCharacters(params.s3Params.Key);

  let s3params = {};
  Object.assign(s3params, params.s3Params);

  tryOpenFile();

  return uploader;

  process.on('uncaughtException', function (err) {
    handleError(err);
  });

  function handleError(err) {
    if (isAborted) return;

    isAborted = true;
    if (err && err.retryable === false) {
      handleAbort();
    }

    uploader.emit('error', err);
  }

  function handleAbort() {
    isAborted = true;
  }

  function tryOpenFile() {
    self.s3.headObject(s3params, function (err, metadata) {
      if (err) {
        handleError(err);
        return;
      }

      localFileSize = metadata.ContentLength;

      uploader.progressLoaded = 0;
      uploader.progressTotal = metadata.ContentLength;
      uploader.emit("fileStat", uploader);

      startDownloadFile();
    });
  }

  function startDownloadFile() {
    if (localFileSize >= self.multipartDownloadThreshold) {
      if (self.resumeDownload &&
        (uploader.progressParts === null ||
          self.multipartDownloadSize === uploader.progressPartSize)) {
        resumeMultipartDownload();
      } else {
        startMultipartDownload();
      }
    } else {
      tryGettingObject((err, data) => {
        if (isAborted) return;

        if (err) {
          handleError(err);
          return;
        }

        uploader.emit('fileDownloaded', data);
      });
    }
  }

  function startMultipartDownload() {
    if (isAborted) return;

    fs.open(localFile, 'w+', (err, fd) => {
      if (isAborted) return;

      if (err) {
        handleError(err);
        return;
      }

      s3params = {
        Bucket: s3params.Bucket,
        Key: s3params.Key,
      };

      tryMultipartDownload(fd, (err) => {
        if (fd) {
          fs.closeSync(fd);
          fd = null;
        }

        if (isAborted) return;

        if (err) {
          handleError(err);
          return;
        }

        uploader.emit('fileDownloaded');
      });
    });

    function tryMultipartDownload(fd, cb) {
      if (isAborted) {
        cb();
        return;
      }

      let cursor = 0;
      let nextPartNumber = 1;
      while (cursor < uploader.progressTotal) {
        let start = cursor;
        let end = cursor + self.multipartDownloadSize;
        if (end > uploader.progressTotal) {
          end = uploader.progressTotal;
        }
        cursor = end;

        let part = {
          Done: false,
          Start: start,
          End: end,
          PartNumber: nextPartNumber++
        };

        self.s3pend.go(startDownloadPart(fd, part));
      }

      self.s3pend.wait(cb);
    }
  }

  function resumeMultipartDownload() {
    if (isAborted) return;

    fs.open(localFile, 'w+', (err, fd) => {
      if (isAborted) return;

      if (err) {
        handleError(err);
        return;
      }

      s3params = {
        Bucket: s3params.Bucket,
        Key: s3params.Key,
      };

      tryResumeMultipartDownload(fd, (err) => {
        if (fd) {
          fs.closeSync(fd);
          fd = null;
        }

        if (isAborted) return;

        if (err) {
          handleError(err);
          return;
        }

        uploader.emit('fileDownloaded');
      });
    });

    function tryResumeMultipartDownload(fd, cb) {
      if (isAborted) {
        cb();
        return;
      }

      angular.forEach(uploader.progressParts, (part, partNumber) => {
        if (part.Done === true) {
          uploader.progressLoaded += self.multipartDownloadSize;
        }
      });
      uploader.emit("progress", uploader);

      let cursor = 0;
      let nextPartNumber = 1;
      while (cursor < uploader.progressTotal) {
        let start = cursor;
        let end = cursor + self.multipartDownloadSize;
        if (end > uploader.progressTotal) {
          end = uploader.progressTotal;
        }
        cursor = end;

        // already done loaded
        if (!uploader.progressParts[nextPartNumber] ||
          uploader.progressParts[nextPartNumber].Done !== true) {
          let part = {
            Done: false,
            Start: start,
            End: end,
            PartNumber: nextPartNumber++
          };

          self.s3pend.go(startDownloadPart(fd, part));
        }
      }

      self.s3pend.wait(cb);
    }
  }

  function startDownloadPart(fd, part) {
    return function (pendCb) {
      tryDownloadPart((err, data) => {
        pendCb();

        if (isAborted) return;

        if (err) {
          handleError(err);
          return;
        }

        uploader.progressParts[part.PartNumber] = part;
        uploader.emit('filePartDownloaded', part);
      });
    };

    function tryDownloadPart(cb) {
      if (isAborted) {
        cb();
        return;
      }

      if (part.Done === true) {
        cb(null, part);
        return;
      }

      let params = Object.assign({}, s3params);
      params.Range = `bytes=${part.Start}-${part.End}`;

      let partStream = fs.createWriteStream(null, {
        fd: fd,
        flags: 'r+',
        start: part.Start,
        autoClose: false
      });

      let s3downloader = self.s3.getObject(params).createReadStream();
      s3downloader.on('data', (chunk) => {
        if (isAborted) return;

        uploader.progressLoaded += chunk.length;
        uploader.emit('progress', uploader);
      });
      s3downloader.on('end', () => {
        if (isAborted) return;

        part.Done = true;

        uploader.emit('progress', uploader);

        cb(null, part);
      });
      s3downloader.on('error', (err) => {
        if (isAborted) return;

        cb(err);
      });
      s3downloader.pipe(self.s3stream).pipe(partStream);
    }
  }

  function tryGettingObject(cb) {
    let fileStream = fs.createWriteStream(localFile, {
      flags: 'w+',
      autoClose: false
    });

    let s3downloader = self.s3.getObject(s3params).createReadStream();
    s3downloader.on('data', (chunk) => {
      if (isAborted) return;

      uploader.progressLoaded += chunk.length;
      uploader.emit('progress', uploader);
    });
    s3downloader.on('end', () => {
      if (isAborted) return;

      uploader.progressLoaded = uploader.progressTotal;
      uploader.emit('progress', uploader);

      cb(null);
    });
    s3downloader.on('error', (err) => {
      if (isAborted) return;

      cb(err);
    });

    s3downloader.pipe(self.s3stream).pipe(fileStream);
  }
};

function encodeSpecialCharacters(filename) {
  // Note: these characters are valid in URIs, but S3 does not like them for
  // some reason.
  return filename.replace(/[!'()*]/g, function (char) {
    return '%' + char.charCodeAt(0).toString(16);
  });
}

function smallestPartSizeFromFileSize(fileSize) {
  var partSize = Math.ceil(fileSize / MAX_MULTIPART_COUNT);

  if (partSize < MIN_MULTIPART_SIZE) {
    return MIN_MULTIPART_SIZE;
  }

  return partSize + (MIN_MULTIPART_SIZE - partSize % MIN_MULTIPART_SIZE);
}