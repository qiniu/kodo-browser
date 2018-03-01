"use strict";

var fs = require("fs"),
  path = require("path"),
  mime = require("mime"),
  util = require("./util"),
  ioutil = require("./ioutil"),
  Base = require("./base");
var isDebug = process.env.NODE_ENV == "development";

class UploadJob extends Base {
  /**
   *
   * @param osClient
   * @param config
   *    config.from {object|string}  {name, path} or /home/admin/a.jpg
   *    config.to   {object|string}  {bucket, key} or s3://bucket/test/a.jpg
   *    config.prog   {object}  {loaded, total}
   *    config.status     {string} default 'waiting'
   *    config.maxConcurrency  {number} default 10
   *    config.resumeUpload  {bool} default true
   *    config.multipartUploadThreshold  {number} default 100M
   *    config.multipartUploadSize  {number} default 8M
   *
   * events:
   *    statuschange(state) 'running'|'waiting'|'stopped'|'failed'|'finished'
   *    stopped
   *    error  (err)
   *    complete
   *    progress ({loaded:100, total: 1200})
   */
  constructor(osClient, config) {
    super();

    this._config = {};
    Object.assign(this._config, config);

    if (!this._config.from) {
      console.log("upload needs from option");
      return;
    }
    if (!this._config.to) {
      console.log("upload needs to option");
      return;
    }

    this.id = "uj-" + new Date().getTime() + "-" + ("" + Math.random()).substring(2);

    this.client = osClient;
    this.region = this._config.region;

    this.from = util.parseLocalPath(this._config.from);
    this.to = util.parseS3Path(this._config.to);

    this.prog = this._config.prog || {
      total: 0,
      loaded: 0
    };

    this.maxConcurrency = config.maxConcurrency || 10;
    this.resumeUpload = this._config.resumeUpload || true;
    this.multipartUploadThreshold = this._config.multipartUploadThreshold || 100;
    this.multipartUploadSize = this._config.multipartUploadSize || 8;

    this.message = this._config.message;
    this.status = this._config.status || "waiting";
    this.stopFlag = this.status != "running";
  }
}

UploadJob.prototype.start = function () {
  if (this.status == "running") return;

  if (isDebug) {
    console.log(`Try uploading ${this.from.path} to s3://${this.to.bucket}/${this.to.key}`);
  }

  this.message = "";
  this.stopFlag = false;
  this.startTime = new Date().getTime();
  this.endTime = null;

  this._changeStatus("running");

  // start
  this.startUpload();
  this.startSpeedCounter();

  return this;
};

UploadJob.prototype.stop = function () {
  if (this.status == "stopped") return;

  if (isDebug) {
    console.log(`Pausing ${this.from.path}`);
  }

  clearInterval(this.speedTid);

  this.stopFlag = true;
  this.speed = 0;
  this.predictLeftTime = 0;

  this._changeStatus("stopped");

  return this;
};

UploadJob.prototype.wait = function () {
  if (this.status == "waiting") return;

  if (isDebug) {
    console.log(`Pendding ${this.from.path}`);
  }

  this._lastStatusFailed = this.status == "failed";
  this.stopFlag = true;

  this._changeStatus("waiting");

  return this;
};

/**
 * uploading
 */
UploadJob.prototype.startUpload = function () {
  var self = this;

  if (isDebug) {
    console.log(`Start uploading ${self.from.path} to s3://${self.to.bucket}/${self.to.key}`);
  }

  var client = ioutil.createClient({
    s3Client: self.client,
    s3MaxAsync: self.maxConcurrency,
    resumeUpload: self.resumeUpload,
    resumePoints: self.resumePoints,
    multipartUploadThreshold: self.multipartUploadThreshold * 1024 * 1024,
    multipartUploadSize: self.multipartUploadSize * 1024 * 1024,
  });

  var params = {
    s3Params: {
      Bucket: self.to.bucket,
      Key: self.to.key
    },
    localFile: self.from.path,
    isDebug: isDebug
  };

  var uploader = client.uploadFile(params);
  uploader.on('fileStat', function (e2) {
    self.prog.total = e2.progressTotal;

    self.emit('progress', self.prog);
  });
  uploader.on('progress', function (e2) {
    self.prog.total = e2.progressTotal;
    self.prog.loaded = e2.progressLoaded;

    self.emit('progress', self.prog);
  });
  uploader.on('fileUploaded', function (data) {
    self._changeStatus("finished");

    self.emit("complete");
  });
  uploader.on('error', function (err) {
    console.warn("upload object error:", err);

    self.message = err.message;
    self._changeStatus("failed");

    self.emit("error", err);
  });
};

UploadJob.prototype.startSpeedCounter = function () {
  var self = this;

  self.lastLoaded = self.prog.loaded || 0;
  self.lastSpeed = 0;

  clearInterval(self.speedTid);
  self.speedTid = setInterval(function () {
    if (self.stopFlag) {
      self.speed = 0;
      self.predictLeftTime = 0;
      return;
    }

    self.speed = self.prog.loaded - self.lastLoaded;
    if (self.speed <= 0) {
      self.speed = self.lastSpeed * 0.8;
    }
    if (self.lastSpeed != self.speed) {
      self.emit("speedChange", self.speed);
    }

    self.lastLoaded = self.prog.loaded;
    self.lastSpeed = self.speed;

    self.predictLeftTime =
      self.speed <= 0 ?
      0 :
      Math.floor((self.prog.total - self.prog.loaded) / self.speed * 1000);
  }, 1000);
};

UploadJob.prototype._changeStatus = function (status) {
  this.status = status;
  this.emit("statuschange", this.status);

  if (status == "failed" || status == "stopped" || status == "finished") {
    clearInterval(this.speedTid);

    this.endTime = new Date().getTime();
    this.speed = 0;
    this.predictLeftTime = 0;
  }
};

module.exports = UploadJob;