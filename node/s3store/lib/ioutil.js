'use strict';

let AWS = require('aws-sdk'),
  crypto = require('crypto'),
  EventEmitter = require('events').EventEmitter,
  fs = require('fs-extra'),
  mime = require('mime'),
  Pend = require('pend');

var MIN_MULTIPART_SIZE = 4 << 20; // 4MB
var MAX_PUTOBJECT_SIZE = 5 << 30; // 5GB
var MAX_DELETE_COUNT = 1000;
var MAX_MULTIPART_COUNT = 10000;

exports.createClient = function (options) {
  return new Client(options);
};

exports.AWS = AWS;
exports.Client = Client;

exports.MAX_PUTOBJECT_SIZE = MAX_PUTOBJECT_SIZE;
exports.MAX_DELETE_COUNT = MAX_DELETE_COUNT;
exports.MAX_MULTIPART_COUNT = MAX_MULTIPART_COUNT;
exports.MIN_MULTIPART_SIZE = MIN_MULTIPART_SIZE;

function Client(options) {
  options = options ? options : {};
  this.s3 = options.s3Client || new AWS.S3(options.s3Options);
  this.s3Pend = new Pend();
  this.s3Pend.max = options.s3MaxAsync || 10; // connection limit for per domain!
  this.s3RetryCount = options.s3RetryCount || 3;
  this.s3RetryDelay = options.s3RetryDelay || 1000;
  this.multipartUploadThreshold = options.multipartUploadThreshold || (MIN_MULTIPART_SIZE * 20);
  this.multipartUploadSize = options.multipartUploadSize || (MIN_MULTIPART_SIZE * 2);
  this.multipartDownloadThreshold = options.multipartDownloadThreshold || (MIN_MULTIPART_SIZE * 20);
  this.multipartDownloadSize = options.multipartDownloadSize || (MIN_MULTIPART_SIZE * 2);

  if (this.multipartUploadThreshold < MIN_MULTIPART_SIZE) {
    throw new Error('Minimum multipartUploadThreshold is 4MB.');
  }
  if (this.multipartUploadThreshold > MAX_PUTOBJECT_SIZE) {
    throw new Error('Maximum multipartUploadThreshold is 5GB.');
  }
  if (this.multipartUploadSize < MIN_MULTIPART_SIZE) {
    throw new Error('Minimum multipartUploadSize is 4MB.');
  }
  if (this.multipartUploadSize > MAX_PUTOBJECT_SIZE) {
    throw new Error('Maximum multipartUploadSize is 5GB.');
  }
}

Client.prototype.uploadFile = function (params) {
  let self = this;
  let localFile = params.localFile;
  let localFileStat = null;
  let parts = [];
  let uploadedParts = {};
  let uploadId = params.uploadId;
  let fatalError = false;
  let isDebug = params.isDebug;

  let uploader = new EventEmitter();
  uploader.setMaxListeners(0);
  uploader.progressAmount = 0;
  uploader.progressAmountParts = {};
  uploader.progressTotal = 0;
  uploader.totalUploadedParts = 0;
  uploader.totalParts = 0;
  uploader.abort = handleAbort;

  params.s3Params.Key = encodeSpecialCharacters(params.s3Params.Key);

  let s3params = extend({}, params.s3Params);
  if (s3params.ContentType === undefined) {
    let defaultContentType = params.defaultContentType || 'application/octet-stream';
    s3params.ContentType = mime.lookup(localFile, defaultContentType);
  }

  openFile();

  return uploader;

  process.on('uncaughtException', function (err) {
    handleError(err);
  });

  function handleError(err) {
    if (fatalError) return;

    fatalError = true;
    if (err && err.retryable === false) {
      handleAbort();
    }

    uploader.emit('error', err);
  }

  function handleAbort() {
    fatalError = true;

    if (uploadId) {
      self.s3.abortMultipartUpload({
        Bucket: s3params.Bucket,
        Key: s3params.Key,
        UploadId: uploadId
      }, function (err, result) {});
    }
  }

  function openFile() {
    fs.stat(localFile, function (err, stat) {
      if (err) {
        handleError(err);
        return;
      }

      localFileStat = stat;

      uploader.progressAmount = 0;
      uploader.progressTotal = stat.size;
      uploader.emit("fileStat", uploader);

      startUploadingObject();
    });
  }

  function startUploadingObject() {
    if (localFileStat.size >= self.multipartUploadThreshold) {
      let multipartUploadSize = self.multipartUploadSize;
      let partsRequiredCount = Math.ceil(localFileStat.size / multipartUploadSize);
      if (partsRequiredCount > MAX_MULTIPART_COUNT) {
        multipartUploadSize = smallestPartSizeFromFileSize(localFileStat.size);
      }
      if (multipartUploadSize > MAX_PUTOBJECT_SIZE) {
        let err = new Error(`File size exceeds maximum object size: ${localFile}`);
        err.retryable = false;

        handleError(err);
        return;
      }

      if (uploadId) {
        startResumeMultipartUpload();
      } else {
        startMultipartUpload(multipartUploadSize);
      }
    } else {
      console.time(`Putting       s3://${s3params.Bucket}/${s3params.Key}`);
      doWithRetry(tryPuttingObject, self.s3RetryCount, self.s3RetryDelay, function (err, data) {
        if (fatalError) return;
        if (err) {
          handleError(err);
          return;
        }

        console.timeEnd(`Putting       s3://${s3params.Bucket}/${s3params.Key}`);
        uploader.emit('fileUploaded', data);
      });
    }
  }

  function startResumeMultipartUpload() {
    console.time(`Resuming      s3://${s3params.Bucket}/${s3params.Key}`);

    doWithRetry(tryStartResumeMultipartUpload, self.s3RetryCount, self.s3RetryDelay, function (err, data) {
      if (fatalError) return;
      if (err) {
        handleError(err);
        return;
      }

      uploader.emit('fileResumedUpload', data);

      for (var i = 0; i < data.Parts.length; i++) {
        uploadedParts[data.Parts[i].PartNumber] = {};
        uploadedParts[data.Parts[i].PartNumber].ETag = data.Parts[i].ETag;
        uploadedParts[data.Parts[i].PartNumber].Size = data.Parts[i].Size;
        uploadedParts[data.Parts[i].PartNumber].LastModified = data.Parts[i].LastModified;

        uploader.progressAmount += data.Parts[i].Size;
        uploader.totalUploadedParts += 1;
      }

      uploader.emit('progress', uploader);

      s3params = {
        Bucket: s3params.Bucket,
        Key: s3params.Key,
      };

      queueMultipartUpload(data.UploadId, data.Parts[0] ? data.Parts[0].Size : self.multipartUploadSize, function (completeErr, completeData) {
        console.timeEnd(`Resuming      s3://${s3params.Bucket}/${s3params.Key}`);
      });
    });
  }

  function tryStartResumeMultipartUpload(cb) {
    if (fatalError) return;

    self.s3Pend.go(function (pendCb) {
      if (fatalError) {
        pendCb();
        return;
      }

      // list Parts already uploaded
      self.s3.listParts({
        Bucket: s3params.Bucket,
        Key: s3params.Key,
        UploadId: uploadId
      }, function (err, data) {
        pendCb();

        if (fatalError) return;

        cb(err, data);
      });
    });
  }

  function startMultipartUpload(multipartUploadSize) {
    console.time(`Starting      s3://${s3params.Bucket}/${s3params.Key}`);

    doWithRetry(tryCreateMultipartUpload, self.s3RetryCount, self.s3RetryDelay, function (err, data) {
      if (fatalError) return;
      if (err) {
        handleError(err);
        return;
      }

      uploader.emit('fileMultipartUpload', data);

      s3params = {
        Bucket: s3params.Bucket,
        Key: s3params.Key,
      };

      queueMultipartUpload(data.UploadId, multipartUploadSize, function (completeErr, completeData) {
        console.timeEnd(`Starting      s3://${s3params.Bucket}/${s3params.Key}`);
      });
    });
  }

  function tryCreateMultipartUpload(cb) {
    if (fatalError) return;

    self.s3Pend.go(function (pendCb) {
      if (fatalError) return;

      self.s3.createMultipartUpload(s3params, function (err, data) {
        pendCb();

        if (fatalError) return;

        cb(err, data);
      });
    });
  }

  function queueMultipartUpload(uploadId, multipartUploadSize, completeCallback) {
    let queue = new Pend();

    let cursor = 0;
    let nextPartNumber = 1;
    while (cursor < localFileStat.size) {
      let start = cursor;
      let end = cursor + multipartUploadSize;
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

      queue.go(makeUploadPart(start, end, part, uploadId));
    }

    queue.wait(function (err) {
      if (fatalError) return;
      if (err) {
        handleError(err);
        return;
      }

      completeMultipartUpload(completeCallback);
    });
  }

  function makeUploadPart(start, end, part, uploadId) {
    return function (cb) {
      doWithRetry(tryUploadPart, self.s3RetryCount, self.s3RetryDelay, function (err, data) {
        if (fatalError) return;
        if (err) {
          handleError(err);
          return;
        }

        uploader.emit('filePartUploaded', part);

        cb();
      });
    };

    function tryUploadPart(cb) {
      if (fatalError) return;

      self.s3Pend.go(function (pendCb) {
        if (fatalError) {
          pendCb();
          return;
        }

        if (!!uploadedParts[part.PartNumber]) {
          pendCb();

          part.ETag = uploadedParts[part.PartNumber].ETag;

          uploader.emit('progress', uploader);

          cb(null, {
            ETag: `"${uploadedParts[part.PartNumber].ETag}"`,
            Size: uploadedParts[part.PartNumber].Size
          });

          return;
        }

        let errorOccured = false;

        s3params.UploadId = uploadId;
        s3params.PartNumber = part.PartNumber;
        s3params.ContentLength = end - start;
        s3params.Body = fs.createReadStream(localFile, {
          start: start,
          end: end
        });;

        let s3req = self.s3.uploadPart(extend({}, s3params));
        s3req.on('httpUploadProgress', function (prog) {
          uploader.progressAmountParts[part.PartNumber] = prog.loaded;
          if (isDebug) {
            console.log(`[M] => ${JSON.stringify(uploader.progressAmountParts)}`);
          }

          uploader.progressAmount = 0;
          for (var partNumber in uploader.progressAmountParts) {
            uploader.progressAmount += uploader.progressAmountParts[partNumber];
          }

          uploader.emit('progress', uploader);
        });
        s3req.send(function (err, data) {
          pendCb();

          if (fatalError || errorOccured) return;
          if (err) {
            errorOccured = true;

            cb(err);
            return;
          }

          part.ETag = data.ETag;

          uploadedParts[part.PartNumber] = uploadedParts[part.PartNumber] ? uploadedParts[part.PartNumber] : {};
          uploadedParts[part.PartNumber].ETag = data.ETag;
          uploadedParts[part.PartNumber].Size = s3params.ContentLength;

          uploader.totalUploadedParts += 1;
          uploader.emit('progress', uploader);

          cb(null, data);
        });
      });
    }
  }

  function completeMultipartUpload(cb) {
    doWithRetry(tryCompleteMultipartUpload, self.s3RetryCount, self.s3RetryDelay, function (err, data) {
      if (fatalError) return;
      if (err) {
        handleError(err);
        return;
      }

      uploader.progressAmount = localFileStat.size;
      uploader.progressTotal = localFileStat.size;
      uploader.emit('progress', uploader);

      uploader.emit('fileUploaded', data);

      cb(err, data);
    });
  }

  function tryCompleteMultipartUpload(cb) {
    if (fatalError) return;

    self.s3Pend.go(function (pendCb) {
      if (fatalError) {
        pendCb();
        return;
      }

      s3params = {
        Bucket: s3params.Bucket,
        Key: s3params.Key,
        UploadId: s3params.UploadId,
        MultipartUpload: {
          Parts: parts
        }
      };

      self.s3.completeMultipartUpload(s3params, function (err, data) {
        pendCb();

        if (fatalError) return;

        cb(err, data);
      });
    });
  }

  function tryPuttingObject(cb) {
    self.s3Pend.go(function (pendCb) {
      if (fatalError) {
        pendCb();
        return;
      }

      s3params.ContentLength = localFileStat.size;
      s3params.Body = fs.createReadStream(localFile);

      let s3req = self.s3.putObject(s3params);
      s3req.on('httpUploadProgress', function (prog) {
        if (isDebug) {
          console.log(`[P] => ${JSON.stringify(prog)}`);
        }

        uploader.progressAmount = prog.loaded;
        uploader.emit('progress', uploader);
      });
      s3req.send(function (err, data) {
        pendCb();

        if (fatalError) return;
        if (err) {
          cb(err);
          return;
        }

        uploader.progressAmount = localFileStat.size;
        uploader.progressTotal = localFileStat.size;
        uploader.emit('progress', uploader);

        cb(null, data);
      });
    });
  }
};

Client.prototype.downloadFile = function (params) {
  let self = this;
  let localFile = params.localFile;
  let localFileFd = null;
  let parts = [];
  let downloadedParts = params.downloadedParts || {};
  let fatalError = false;
  let isDebug = params.isDebug;

  let uploader = new EventEmitter();
  uploader.setMaxListeners(0);
  uploader.progressAmount = 0;
  uploader.progressAmountParts = {};
  uploader.progressTotal = 0;
  uploader.totalDownloadedParts = 0;
  uploader.totalParts = 0;
  uploader.abort = handleAbort;

  params.s3Params.Key = encodeSpecialCharacters(params.s3Params.Key);

  let s3params = extend({}, params.s3Params);

  openFile();

  return uploader;

  process.on('uncaughtException', function (err) {
    handleError(err);
  });

  function handleError(err) {
    if (fatalError) return;

    fatalError = true;
    if (err && err.retryable === false) {
      handleAbort();
    }

    uploader.emit('error', err);
  }

  function handleAbort() {
    fatalError = true;

    if (uploadId) {
      self.s3.abortMultipartUpload({
        Bucket: s3params.Bucket,
        Key: s3params.Key,
        UploadId: uploadId
      }, function (err, result) {});
    }
  }

  function openFile() {
    self.s3.headObject(s3params, function (err, metadata) {
      if (err) {
        handleError(err);
        return;
      }

      fs.open(localFile, 'w+', function (err, fd) {
        if (err) {
          handleError(err);
          return;
        }

        localFileFd = fd;

        uploader.progressAmount = 0;
        uploader.progressTotal = metadata.ContentLength;
        uploader.emit("fileStat", uploader);

        startDownloadingObject();
      });
    });
  }

  function startDownloadingObject() {
    if (uploader.progressTotal >= self.multipartDownloadThreshold) {
      if (false) {
        startResumeMultipartDownload();
      } else {
        startMultipartDownload(self.multipartDownloadSize);
      }
    } else {
      console.time(`Getting       s3://${s3params.Bucket}/${s3params.Key}`);
      doWithRetry(tryGettingObject, self.s3RetryCount, self.s3RetryDelay, function (err, data) {
        if (fatalError) return;
        if (err) {
          handleError(err);
          return;
        }

        console.timeEnd(`Getting       s3://${s3params.Bucket}/${s3params.Key}`);
        uploader.emit('fileDownloaded', data);
      });
    }
  }

  function startResumeMultipartDownload() {

  }

  function startMultipartDownload(partSize) {
    console.time(`Starting      s3://${s3params.Bucket}/${s3params.Key}`);

    self.s3Pend.go(function (pendCb) {
      if (fatalError) {
        pendCb();
        return;
      }

      s3params = {
        Bucket: s3params.Bucket,
        Key: s3params.Key,
      };

      queueMultipartDownload(partSize, function (completeErr, completeData) {
        pendCb();

        console.timeEnd(`Starting      s3://${s3params.Bucket}/${s3params.Key}`);
        uploader.emit('fileDownloaded', completeData);
      });
    });
  }

  function queueMultipartDownload(multipartDownloadSize, completeCallback) {
    let queue = new Pend();

    let cursor = 0;
    let nextPartNumber = 1;
    while (cursor < uploader.progressTotal) {
      let start = cursor;
      let end = cursor + multipartDownloadSize;
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

      queue.go(makeDownloadPart(part));
    }

    queue.wait(function (err) {
      if (fatalError) return;
      if (err) {
        handleError(err);
        return;
      }

      completeCallback(err);
    });
  }

  function makeDownloadPart(part) {
    return function (cb) {
      doWithRetry(tryDownloadPart, self.s3RetryCount, self.s3RetryDelay, function (err, data) {
        if (fatalError) return;
        if (err) {
          handleError(err);
          return;
        }

        uploader.emit('filePartDownloaded', part);

        cb();
      });
    };

    function tryDownloadPart(cb) {
      if (fatalError) return;

      self.s3Pend.go(function (pendCb) {
        if (fatalError) {
          pendCb();
          return;
        }

        if (!!downloadedParts[part.PartNumber]) {
          pendCb();

          part.Done = true;

          uploader.emit('progress', uploader);

          cb(null, part);
          return;
        }

        s3params.Range = `bytes=${part.Start}-${part.End}`;

        let errorOccured = false;

        let s3req = self.s3.getObject(extend({}, s3params));
        s3req.on('httpDownloadProgress', function (prog) {
          uploader.progressAmountParts[part.PartNumber] = prog.loaded;
          if (isDebug) {
            console.log(`[M] => ${JSON.stringify(uploader.progressAmountParts)}`);
          }

          uploader.progressAmount = 0;
          for (var partNumber in uploader.progressAmountParts) {
            uploader.progressAmount += uploader.progressAmountParts[partNumber];
          }

          uploader.emit('progress', uploader);
        });
        s3req.send(function (err, data) {
          pendCb();

          if (fatalError || errorOccured) return;
          if (err) {
            errorOccured = true;

            cb(err);
            return;
          }

          let partStream = fs.createWriteStream(null, {
            flags: 'r+',
            fd: localFileFd,
            start: part.Start
          });

          partStream.write(data.Body, function () {
            part.Done = true;

            downloadedParts[part.PartNumber] = part;

            uploader.totalDownloadedParts += 1;
            uploader.emit('progress', uploader);

            cb(null, data);
          });
        });
      });
    }
  }

  function tryGettingObject(cb) {
    self.s3Pend.go(function (pendCb) {
      if (fatalError) {
        pendCb();
        return;
      }

      let fileStream = fs.createWriteStream(null, {
        fd: localFileFd,
        flags: 'w+'
      });

      let s3req = self.s3.getObject(s3params);
      s3req.on('httpDownloadProgress', function (prog) {
        if (isDebug) {
          console.log(`[P] => ${JSON.stringify(prog)}`);
        }

        uploader.progressAmount = prog.loaded;
        uploader.emit('progress', uploader);
      });
      s3req.on('httpData', function (chunk, response) {
        if (response.error) {
          pendCb();

          s3req.abort();

          cb(response.error);
        } else {
          fileStream.write(chunk);
        }
      });
      s3req.on('httpDone', function (response) {
        pendCb();

        uploader.progressAmount = uploader.progressTotal;
        uploader.emit('progress', uploader);

        cb(response.error);
      });
      s3req.on('httpError', function (err) {
        pendCb();

        cb(err);
      });
      s3req.send();
    });
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

function calcMD5(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex').toString('hex');
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