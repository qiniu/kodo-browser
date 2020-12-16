"use strict";

require("events").EventEmitter.prototype._maxListeners = 1000;

const UploadJob = require("./upload-job"),
      DownloadJob = require("./download-job");

/**
 * QiniuStore
 */

class QiniuStore {
  createUploadJob(options) {
    return new UploadJob(options);
  }

  createDownloadJob(options) {
    return new DownloadJob(options);
  }
}

module.exports = QiniuStore;
