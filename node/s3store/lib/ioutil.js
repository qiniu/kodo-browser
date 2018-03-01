'use strict';

let AWS = require('aws-sdk'),
  EventEmitter = require('events').EventEmitter,
  fs = require('fs'),
  mime = require('mime'),
  Pend = require('pend');

const MIN_MULTIPART_SIZE = 4 << 20; // 4MB
const MAX_PUTOBJECT_SIZE = 5 << 30; // 5GB
const MAX_MULTIPART_COUNT = 10000;

exports.AWS = AWS;
exports.Client = Client;

exports.MIN_MULTIPART_SIZE = MIN_MULTIPART_SIZE;
exports.MAX_PUTOBJECT_SIZE = MAX_PUTOBJECT_SIZE;
exports.MAX_MULTIPART_COUNT = MAX_MULTIPART_COUNT;

exports.createClient = function (options) {
  return new Client(options);
};

function Client(options) {
  options = options ? options : {};

  this.s3 = options.s3Client || new AWS.S3(options.s3Options);

  this.s3pend = new Pend();
  this.s3pend.max = options.maxConcurrency || 10; // connection limit for per domain!

  this.s3RetryCount = options.s3RetryCount || 3;
  this.s3RetryDelay = options.s3RetryDelay || 1000;

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

  let parts = [];
  let uploadedParts = {};
  let isAborted = false;
  let checkPoints = params.resumePoints;
  let isDebug = params.isDebug;

  let uploader = new EventEmitter();
  uploader.setMaxListeners(0);
  uploader.progressLoaded = 0;
  uploader.progressParts = {};
  uploader.progressTotal = 0;
  uploader.totalUploadedParts = 0;
  uploader.totalParts = 0;
  uploader.abort = handleAbort;

  params.s3Params.Key = encodeSpecialCharacters(params.s3Params.Key);

  let s3params = extend({}, params.s3Params);
  if (s3params.ContentType === undefined) {
    let defaultContentType = params.defaultContentType || 'application/octet-stream';
    s3params.ContentType = mime.getType(localFile) || defaultContentType;
  }

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

    uploader.emit('abort', data);
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

      if (self.resumeUpload) {
        resumeMultipartUpload();
      } else {
        startMultipartUpload();
      }
    } else {
      console.time(`Elapsed put s3://${s3params.Bucket}/${s3params.Key}`);

      doWithRetry(tryPuttingObject, self.s3RetryCount, self.s3RetryDelay, function (err, data) {
        console.timeEnd(`Elapsed put s3://${s3params.Bucket}/${s3params.Key}`);

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
    console.log(`Multiparting  s3://${s3params.Bucket}/${s3params.Key}`);

    doWithRetry(tryMultipartUpload, self.s3RetryCount, self.s3RetryDelay, function (err, data) {
      if (isAborted) return;

      if (err) {
        handleError(err);
        return;
      }

      uploader.emit('fileUploaded', data);
    });

    function tryMultipartUpload(cb) {
      if (isAborted) return;

      console.time(`Elapsed multipart  s3://${s3params.Bucket}/${s3params.Key}`);

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

        if (isDebug) {
          console.log(`[M] => ${JSON.stringify(prog)}`);
        }

        uploader.progressLoaded = prog.loaded;
        uploader.emit('progress', uploader);
      });
      s3uploader.send(function (err, data) {
        console.timeEnd(`Elapsed multipart  s3://${s3params.Bucket}/${s3params.Key}`);

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
    console.log(`Resuming  s3://${s3params.Bucket}/${s3params.Key}`);

    doWithRetry(tryResumeMultipartUpload, self.s3RetryCount, self.s3RetryDelay, function (err, data) {
      if (isAborted) return;

      if (err) {
        handleError(err);
        return;
      }

      uploader.emit('fileResumedUpload', data);

      uploader.progressLoaded = 0;
      uploader.totalUploadedParts = 0;
      for (var i = 0; i < data.Parts.length; i++) {
        uploadedParts[data.Parts[i].PartNumber] = {};
        uploadedParts[data.Parts[i].PartNumber].ETag = data.Parts[i].ETag;
        uploadedParts[data.Parts[i].PartNumber].Size = data.Parts[i].Size;
        uploadedParts[data.Parts[i].PartNumber].LastModified = data.Parts[i].LastModified;

        uploader.progressLoaded += data.Parts[i].Size;
        uploader.totalUploadedParts += 1;
      }
      uploader.emit('progress', uploader);

      s3params = {
        Bucket: s3params.Bucket,
        Key: s3params.Key,
      };

      makeMultipartUpload(data.UploadId, data.Parts[0] ? data.Parts[0].Size : self.multipartUploadSize);
    });

    function tryResumeMultipartUpload(cb) {
      if (isAborted) return;

      if (checkPoints && checkPoints.UploadId) {
        // list Parts already uploaded
        self.s3.listParts({
          Bucket: s3params.Bucket,
          Key: s3params.Key,
          UploadId: checkPoints.UploadId
        }, function (err, data) {
          if (isAborted) return;

          cb(err, data);
        });
      } else {
        // create new multipart upload
        self.s3.createMultipartUpload({
          Bucket: s3params.Bucket,
          Key: s3params.Key
        }, function (err, data) {
          if (isAborted) return;

          data.Parts = [];

          cb(err, data);
        });
      }
    }
  }

  function makeMultipartUpload(uploadId, partSize) {
    console.time(`Elapsed resume  s3://${s3params.Bucket}/${s3params.Key}`);

    let cursor = 0;
    let nextPartNumber = 1;
    while (cursor < localFileStat.size) {
      let start = cursor;
      let end = cursor + partSize;
      if (end > localFileStat.size) {
        end = localFileStat.size;
      }
      cursor = end;

      let part = {
        ETag: null,
        PartNumber: nextPartNumber++
      };

      parts.push(part);

      uploader.totalParts += 1;

      self.s3pend.go(startUploadPart(start, end, part, uploadId));
    }

    self.s3pend.wait(function (err) {
      console.timeEnd(`Elapsed resume  s3://${s3params.Bucket}/${s3params.Key}`);

      if (isAborted) return;

      if (err) {
        handleError(err);
        return;
      }

      completeMultipartUpload(uploadId);
    });
  }

  function startUploadPart(start, end, part, uploadId) {
    let retryCount = 0;

    return function (pendCb) {
      doWithRetry(tryUploadPart, self.s3RetryCount, self.s3RetryDelay, function (err, data) {
        pendCb();

        if (isAborted) return;

        if (err) {
          handleError(err);
          return;
        }

        uploader.emit('filePartUploaded', data);
      });
    };

    function tryUploadPart(cb) {
      retryCount++;

      if (isAborted) {
        if (retryCount >= self.s3RetryCount) {
          cb();
        }
        return;
      }

      if (!!uploadedParts[part.PartNumber]) {
        part.ETag = uploadedParts[part.PartNumber].ETag;

        cb(null, {
          Etag: `"${part.Etag}"`,
          Size: part.Size
        });
        return;
      }

      let params = extend({}, s3params);
      params.UploadId = uploadId;
      params.PartNumber = part.PartNumber;
      params.ContentLength = end - start;
      params.Body = fs.createReadStream(localFile, {
        start: start,
        end: end
      });

      let s3uploader = self.s3.uploadPart(params);
      s3uploader.on('httpUploadProgress', function (prog) {
        if (isAborted) return;

        let oldLoaded = uploader.progressParts[part.PartNumber] || 0;

        uploader.progressParts[part.PartNumber] = prog.loaded;
        uploader.progressLoaded += prog.loaded - oldLoaded;

        if (isDebug) {
          console.log(`[R] => ${JSON.stringify({loaded: uploader.progressLoaded, total: uploader.progressTotal, part: part.PartNumber, key: s3params.Key})}`);
        }

        uploader.emit('progress', uploader);
      });
      s3uploader.send(function (err, data) {
        if (isAborted) return;

        if (err) {
          cb(err);
          return;
        }

        part.ETag = data.ETag;

        uploadedParts[part.PartNumber] = uploadedParts[part.PartNumber] ? uploadedParts[part.PartNumber] : {};
        uploadedParts[part.PartNumber].ETag = data.ETag;
        uploadedParts[part.PartNumber].Size = s3params.ContentLength;

        uploader.progressParts[part.PartNumber] = s3params.ContentLength;
        uploader.totalUploadedParts += 1;
        uploader.emit('progress', uploader);

        cb(null, data);
      });
    };
  }

  function completeMultipartUpload(uploadId) {
    doWithRetry(tryCompleteMultipartUpload, self.s3RetryCount, self.s3RetryDelay, function (err, data) {
      if (isAborted) return;

      if (err) {
        handleError(err);
        return;
      }

      uploader.emit('fileUploaded', data);
    });

    function tryCompleteMultipartUpload(cb) {
      if (isAborted) return;

      let params = {
        Bucket: s3params.Bucket,
        Key: s3params.Key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts
        }
      };

      self.s3.completeMultipartUpload(params, function (err, data) {
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
    s3uploader.on('httpUploadProgress', function (prog) {
      if (isAborted) return;

      if (isDebug) {
        console.log(`[P] => ${JSON.stringify(prog)}`);
      }

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
};

Client.prototype.downloadFile = function (params) {
  let self = this;

  let localFile = params.localFile;
  let localFileSize = 0;

  let parts = [];
  let downloadedParts = params.downloadedParts || {};
  let isAborted = false;
  let checkPoints = params.resumePoints;
  let isDebug = params.isDebug;

  let uploader = new EventEmitter();
  uploader.setMaxListeners(0);
  uploader.progressLoaded = 0;
  uploader.progressParts = {};
  uploader.progressTotal = 0;
  uploader.totalDownloadedParts = 0;
  uploader.totalParts = 0;
  uploader.abort = handleAbort;

  params.s3Params.Key = encodeSpecialCharacters(params.s3Params.Key);

  let s3params = extend({}, params.s3Params);

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
      if (self.resumeDownload) {
        resumeMultipartDownload();
      } else {
        startMultipartDownload();
      }
    } else {
      console.time(`Elpased get  s3://${s3params.Bucket}/${s3params.Key}`);

      doWithRetry(tryGettingObject, self.s3RetryCount, self.s3RetryDelay, function (err, data) {
        if (isAborted) return;

        if (err) {
          handleError(err);
          return;
        }

        console.timeEnd(`Elpased get  s3://${s3params.Bucket}/${s3params.Key}`);

        uploader.emit('fileDownloaded', data);
      });
    }
  }

  function startMultipartDownload() {
    console.log(`Multiparting  s3://${s3params.Bucket}/${s3params.Key}`);

    if (isAborted) return;

    fs.open(localFile, 'w+', function (err, fd) {
      if (isAborted) return;

      if (err) {
        handleError(err);
        return;
      }

      s3params = {
        Bucket: s3params.Bucket,
        Key: s3params.Key,
      };

      makeMultipartDownload(fd);
    });
  }

  function resumeMultipartDownload() {

  }

  function makeMultipartDownload(fd) {
    console.time(`Elapsed multipart  s3://${s3params.Bucket}/${s3params.Key}`);

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

      parts.push(part);

      uploader.totalParts += 1;

      self.s3pend.go(startDownloadPart(fd, part));
    }

    self.s3pend.wait(function (err) {
      console.timeEnd(`Elapsed multipart  s3://${s3params.Bucket}/${s3params.Key}`);

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
  }

  function startDownloadPart(fd, part) {
    let retryCount = 0;

    return function (pendCb) {
      doWithRetry(tryDownloadPart, self.s3RetryCount, self.s3RetryDelay, function (err, data) {
        pendCb();

        if (isAborted) return;

        if (err) {
          handleError(err);
          return;
        }

        uploader.emit('filePartDownloaded', part);
      });
    };

    function tryDownloadPart(cb) {
      retryCount++;

      if (isAborted) {
        if (retryCount >= self.s3RetryCount) {
          cb();
        }
        return;
      }

      if (!!downloadedParts[part.PartNumber]) {
        part.Done = true;

        cb(null, part);
        return;
      }

      let params = extend({}, s3params);
      params.Range = `bytes=${part.Start}-${part.End}`;

      let s3downloader = self.s3.getObject(params);
      s3downloader.on('httpDownloadProgress', function (prog) {
        if (isAborted) return;

        let oldLoaded = uploader.progressParts[part.PartNumber] || 0;

        uploader.progressParts[part.PartNumber] = prog.loaded;
        uploader.progressLoaded += prog.loaded - oldLoaded;

        if (isDebug) {
          console.log(`[M] => ${JSON.stringify({loaded: uploader.progressLoaded, total: uploader.progressTotal, part: part, key: s3params.Key})}`);
        }

        uploader.emit('progress', uploader);
      });
      s3downloader.send(function (err, data) {
        if (isAborted) return;

        if (err) {
          cb(err);
          return;
        }

        let partStream = fs.createWriteStream(null, {
          fd: fd,
          flags: 'r+',
          start: part.Start,
          autoClose: false
        });
        partStream.on('error', function (err) {
          cb(err);
        });
        partStream.write(data.Body, function () {
          data.Body = null;

          part.Done = true;

          downloadedParts[part.PartNumber] = part;

          uploader.totalDownloadedParts += 1;
          uploader.emit('progress', uploader);

          cb(null, data);
        });
      });
    }
  }

  function tryGettingObject(cb) {
    let fileStream = fs.createWriteStream(localFile, {
      flags: 'w+',
      autoClose: true
    });

    let s3downloader = self.s3.getObject(s3params);
    s3downloader.on('httpDownloadProgress', function (prog) {
      if (isAborted) return;

      if (isDebug) {
        console.log(`[P] => ${JSON.stringify(prog)}`);
      }

      uploader.progressLoaded = prog.loaded;
      uploader.emit('progress', uploader);
    });
    s3downloader.on('httpData', function (chunk, response) {
      if (isAborted) return;

      if (response.error) {
        cb(response.error);
        return;
      }

      fileStream.write(chunk);
    });
    s3downloader.on('httpDone', function (response) {
      if (isAborted) return;

      if (response.error) {
        cb(response.error);
        return;
      }

      uploader.progressLoaded = uploader.progressTotal;
      uploader.emit('progress', uploader);

      cb(null, response.data);
    });
    s3downloader.on('httpError', function (err) {
      if (isAborted) return;

      cb(err);
    });
    s3downloader.send();
  }
};

function doWithRetry(fn, tryCount, delay, cb) {
  var tryIndex = 0;

  tryOnce();

  function tryOnce() {
    fn(function (err, result) {
      if (err) {
        if (err.retryable === false) {
          cb(err);
        } else {
          tryIndex += 1;
          if (tryIndex >= tryCount) {
            cb(err);
          } else {
            setTimeout(tryOnce, delay);
          }
        }
      } else {
        cb(null, result);
      }
    });
  }
}

function extend(target, source) {
  for (var propName in source) {
    target[propName] = source[propName];
  }
  return target;
}

function cleanETag(eTag) {
  return eTag ? eTag.replace(/^\s*'?\s*"?\s*(.*?)\s*"?\s*'?\s*$/, "$1") : "";
}

function encodeSpecialCharacters(filename) {
  // Note: these characters are valid in URIs, but S3 does not like them for
  // some reason.
  return filename.replace(/[!'()*]/g, function (char) {
    return '%' + char.charCodeAt(0).toString(16);
  });
}

function smallestPartSizeFromFileSize(fileSize) {
  var partSize = Math.ceil(fileSize / MAX_MULTIPART_COUNT);
  return (partSize < MIN_MULTIPART_SIZE) ? MIN_MULTIPART_SIZE : partSize;
}