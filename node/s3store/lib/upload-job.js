"use strict";

var fs = require("fs"),
  path = require("path"),
  mime = require("mime"),
  util = require("./util"),
  ioutil = require("./ioutil"),
  Base = require("./base"),
  {
    ipcRenderer
  } = require("electron");

class UploadJob extends Base {
  /**
   *
   * @param s3options
   * @param config
   *    config.from {object|string}  {name, path} or /home/admin/a.jpg
   *    config.to   {object|string}  {bucket, key} or s3://bucket/test/a.jpg
   *    config.prog   {object}  {loaded, total}
   *    config.status     {string} default 'waiting'
   *    config.resumeUpload  {bool} default false
   *    config.multipartUploadThreshold  {number} default 100M
   *
   * events:
   *    statuschange(state) 'running'|'waiting'|'stopped'|'failed'|'finished'
   *    stopped
   *    error  (err)
   *    complete
   *    progress ({loaded:100, total: 1200})
   */
  constructor(s3options, config) {
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

    this.s3options = s3options;

    this.from = util.parseLocalPath(this._config.from);
    this.to = util.parseS3Path(this._config.to);

    this.prog = this._config.prog || {
      total: 0,
      loaded: 0
    };

    this.maxConcurrency = config.maxConcurrency || 10;
    this.resumeUpload = this._config.resumeUpload || false;
    this.multipartUploadThreshold = this._config.multipartUploadThreshold || 100;
    this.multipartUploadSize = this._config.multipartUploadSize || 8;

    this.message = this._config.message;
    this.status = this._config.status || "waiting";
    this.stopFlag = this.status != "running";
    this.isDebug = this._config.isDebug;
  }
}

UploadJob.prototype.start = function () {
  if (this.status == "running") return;

  if (this.isDebug) {
    console.log(`Try uploading ${this.from.path} to s3://${this.to.bucket}/${this.to.key}`);
  }

  this.message = "";
  this.stopFlag = false;
  this.startTime = new Date().getTime();
  this.endTime = null;
  this._listener = this.startUpload.bind(this);

  this._changeStatus("running");

  // start
  var job = {
    job: this.id,
    key: 'job-upload',
    options: {
      s3Options: this.s3options,
      maxConcurrency: this.maxConcurrency,
      resumeUpload: this.resumeUpload,
      multipartUploadThreshold: this.multipartUploadThreshold * 1024 * 1024,
      multipartUploadSize: this.multipartUploadSize * 1024 * 1024
    },
    params: {
      s3Params: {
        Bucket: this.to.bucket,
        Key: this.to.key
      },
      localFile: this.from.path,
      isDebug: this.isDebug
    }
  };
  if (this.isDebug) {
    console.log(`[JOB] ${JSON.stringify(job)}`);
  }
  ipcRenderer.send('asynchronous-job', job);
  ipcRenderer.on(this.id, this._listener);

  this.startSpeedCounter();

  return this;
};

UploadJob.prototype.stop = function () {
  if (this.status == "stopped") return;

  if (this.isDebug) {
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

  if (this.isDebug) {
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
UploadJob.prototype.startUpload = function (event, data) {
  if (this.isDebug) {
    console.log(`[IPC MAIN] => ${JSON.stringify(data)}`);
  }

  switch (data.key) {
  case 'fileStat':
    var prog = data.data;

    this.prog.total = prog.progressTotal;
    this.emit('progress', this.prog);
    break;

  case 'progress':
    var prog = data.data;

    this.prog.loaded = prog.progressLoaded;
    this.emit('progress', this.prog);
    break;

  case 'fileUploaded':
    ipcRenderer.removeListener(this.id, this._listener);

    this._changeStatus("finished");
    this.emit("complete");
    break;

  case 'error':
    console.warn("upload object error:", data.error);
    ipcRenderer.removeListener(this.id, this._listener);

    this.message = data.error.message;
    this._changeStatus("failed");
    this.emit("error", data.error);
    break;

  case 'debug':
    console.log("Debug", data);
    break;

  default:
    console.warn("Unknown", data);
  }
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
      self.speed = self.lastSpeed * 0.95;
    }
    if (self.lastSpeed / self.speed > 1.2) {
      self.speed = self.lastSpeed * 0.95;
    }
    if (self.lastSpeed != self.speed) {
      self.emit("speedChange", self.speed * 1.2);
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