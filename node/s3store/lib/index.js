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

  var arr = this._config.endpoint.split("://");
  if (arr.length < 2) {
    console.log("config.endpoint format is error");
    return;
  }

  this._config.endpoint = {
    protocol: arr[0],
    host: arr[1]
  };

  this._s3options = {
    apiVersion: "2006-03-01",
    customUserAgent: `QiniuKodoBrowser/${Global.app.version}/Worker`,
    computeChecksums: true,
    endpoint: this._config.endpoint.protocol + "://" + this._config.endpoint.host,
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

/**
 *
 * Usage:
 *
 *  new S3Store(cfg)
 *     .createUploadJob({from:'/home/a.jpg', to:'kodo://a/b.jpg'})
 *
 * UploadJob class:

 class UploadJob{
    status: ''
    from: { name, size, path }
    to: { bucket, key }
    prog: {loaded, total}

 }

 *
 * @param options
 *    options.from  {object|string} local path, as object: {name:'a.jpg', path:'/home/admin/a.jpg'},  as string: '/home/admin/a.jpg'
 *    options.to    {object|string} kodo path, as object: {bucket:'bucket',key:'pic/b.jpg'} as string: 'kodo://bucket/pic/b.jpg'
 *    options.checkPoints {object} saved progs
 */
S3Store.prototype.createUploadJob = function createUploadJob(options) {
  return new UploadJob(this._s3options, options);
};

/**
 *
 * Usage:
 *
 *  new S3Store(cfg)
 *     .createDownloadJob({from:'/home/a.jpg', to:'kodo://a/b.jpg'})
 *
 * DownloadJob class:

 class DownloadJob{
    status: ''
    from: { name, size, path }
    to: { bucket, key }
    prog: {loaded, total}

 }

 *
 * @param options
 *    options.from    {string} path string, under kodo prefix, example: '/pic/b.jpg', it will be append to presetting kodopath
 *                       as: 'kodo://bucket/users/test_user/pic/b.jpg'
 *    options.to  {string} local path string,  example: '/home/admin/a.jpg'
 *
 *    options.checkPoints {object} saved progs
 */
S3Store.prototype.createDownloadJob = function createDownloadJob(options) {
  return new DownloadJob(this._s3options, options);
};

module.exports = S3Store;
