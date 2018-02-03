"use strict";
const AWS = require("aws-sdk");

require("events").EventEmitter.prototype._maxListeners = 1000;

var TIMEOUT = 60000; //60秒
var UploadJob = require("./upload-job");
var DownloadJob = require("./download-job");

/**
 * OssStore
 *
 * @constructor OssStore
 *
 * @param config
 *    config.aliyunCredential
 *    config.stsToken
 *    config.endpoint
 */

function OssStore(config) {
  if (!config) {
    console.log("需要 config");
    return;
  }

  this._config = {};
  Object.assign(this._config, config);

  if (!this._config.endpoint) {
    console.log("需要 endpoint");
    return;
  }

  var arr = this._config.endpoint.split("://");
  if (arr.length < 2) {
    console.log("endpoint 格式错误");
    return;
  }
  this._config.endpoint = {
    protocol: arr[0],
    host: arr[1]
  };

  this.oss = new AWS.S3({
    apiVersion: "2006-03-01",
    endpoint:
      this._config.endpoint.protocol + "://" + this._config.endpoint.host,
    region: this._config.region,
    accessKeyId: this._config.credential.accessKeyId,
    secretAccessKey: this._config.credential.secretAccessKey,
    maxRetries: 3,
    s3ForcePathStyle: true,
    signatureVersion: "v4",
    httpOptions: {
      connectTimeout: 3000, // 3s
      timeout: 3600000 // 1h
    }
  });
}

/**
 *
 * Usage:
 *
 *  new OssStore(cfg)
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
 *    options.to    {object|string} oss path, as object: {bucket:'bucket',key:'pic/b.jpg'} as string: 'kodo://bucket/pic/b.jpg'
 *
 *    options.checkPoints {object} saveCpt
 *    options.enableCrc64 {boolean}
 */
OssStore.prototype.createUploadJob = function createUploadJob(options) {
  var self = this;

  var job = new UploadJob(self.oss, options);

  //默认是 waiting 状态
  return job;
};

/**
 *
 * Usage:
 *
 *  new OssStore(cfg)
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
 *    options.from    {string} path string, under oss prefix, example: '/pic/b.jpg', it will be append to presetting s3path
 *                       as: 'kodo://bucket/users/test_user/pic/b.jpg'
 *    options.to  {string} local path string,  example: '/home/admin/a.jpg'
 *
 *    options.checkpoint {object} saveCpt
 *    options.enableCrc64 {boolean}
 */
OssStore.prototype.createDownloadJob = function createDownloadJob(options) {
  var self = this;

  var job = new DownloadJob(self.oss, options);

  //默认是 waiting 状态

  return job;
};

module.exports = OssStore;
