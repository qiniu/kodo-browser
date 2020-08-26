"use strict";

require("events").EventEmitter.prototype._maxListeners = 1000;

let UploadJob = require("./upload-job"),
  DownloadJob = require("./download-job");

/**
 * S3Store
 *
 * @constructor S3Store
 *
 * @param config
 *    config.endpoint
 */

function S3Store(config) {
  if (!config) {
    console.log("config is required");
    return;
  }

  this._config = {};
  Object.assign(this._config, config);

  if (!this._config.endpoint) {
    console.log("config.endpoint is required");
    return;
  }
  if (!this._config.region) {
    console.log("config.region is required");
    return;
  }
  if (!this._config.credential) {
    console.log("config.credential is required");
    return;
  }

  this._s3options = {
    apiVersion: "2006-03-01",
    customUserAgent: `QiniuKodoBrowser/${Global.app.version}/Worker`,
    computeChecksums: true,
    endpoint: this._config.endpoint,
    region: this._config.region,
    accessKeyId: this._config.credential.accessKeyId,
    secretAccessKey: this._config.credential.secretAccessKey,
    maxRetries: 3,
    s3ForcePathStyle: true,
    signatureVersion: "v4",
    httpOptions: {
      connectTimeout: this._config.connectTimeout || 3000, // 3s
      timeout: this._config.timeout || 300000 // 5m
    }
  };
}

S3Store.prototype.createUploadJob = function createUploadJob(options) {
  return new UploadJob(this._s3options, options);
};

S3Store.prototype.createDownloadJob = function createDownloadJob(options) {
  return new DownloadJob(this._s3options, options);
};

module.exports = S3Store;
