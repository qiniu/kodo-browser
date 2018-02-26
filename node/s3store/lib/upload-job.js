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

    this.id =
      "uj-" + new Date().getTime() + "-" + ("" + Math.random()).substring(2);

    this.client = osClient;
    this.region = this._config.region;
    this.resumePoints = this._config.resumePoints;

    this.from = util.parseLocalPath(this._config.from);
    this.to = util.parseS3Path(this._config.to);

    this.prog = this._config.prog || {
      total: 0,
      loaded: 0
    };

    this.message = this._config.message;
    this.status = this._config.status || "waiting";
    this.stopFlag = this.status != "running";
    this.maxConcurrency = 10;
  }
}

UploadJob.prototype.start = function () {
  if (this.status == "running") return;

  if (isDebug) {
    console.log(`Try uploading ${this.from.path} to s3://${this.to.bucket}/${this.to.key}`);
  }

  this.message = "";
  this.startTime = new Date().getTime();
  this.endTime = null;

  this.stopFlag = false;
  this._changeStatus("running");
  this._hasCallComplete = false;

  // start
  this.startUpload(this.resumePoints);
  this.startSpeedCounter();

  return this;
};

UploadJob.prototype.stop = function () {
  if (this.status == "stopped") return;

  if (isDebug) {
    console.log(`Pausing ${this.from.path}`);
  }

  clearInterval(this.speedTid);

  this._changeStatus("stopped");
  this.stopFlag = true;

  this.speed = 0;
  this.predictLeftTime = 0;

  return this;
};

UploadJob.prototype.wait = function () {
  if (this.status == "waiting") return;

  if (isDebug) {
    console.log(`Pendding ${this.from.path}`);
  }

  this._lastStatusFailed = this.status == "failed";
  this._changeStatus("waiting");
  this.stopFlag = true;

  return this;
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
    multipartUploadThreshold: 100 << 20, // 100M
    multipartUploadSize: 16 << 20 // 16M
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
    self.prog.loaded = e2.progressAmount;
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
    if (self.speed === 0) {
      self.speed = self.lastSpeed * 0.8;
    }
    if (self.lastSpeed != self.speed) {
      self.emit("speedChange", self.speed);
    }

    self.lastSpeed = self.speed;
    self.lastLoaded = self.prog.loaded;

    self.predictLeftTime =
      self.speed == 0 ?
      0 :
      Math.floor((self.prog.total - self.prog.loaded) / self.speed * 1000);
  }, 1000);
};

UploadJob.prototype.deleteFile = function () {
  var self = this;

  var params = {
    Bucket: self.to.bucket,
    Key: self.to.key
  };

  self.oss.deleteObject(params, function (err) {
    if (err) {
      console.error(
        `Deleting s3://${self.to.bucket}/${self.to.key}`,
        err
      );
    } else {
      console.log(
        `Deleted s3://${self.to.bucket}/${self.to.key}`
      );
    }
  });
};

module.exports = UploadJob;
